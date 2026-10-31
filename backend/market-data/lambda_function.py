import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import traceback
import gzip
from datetime import date, timedelta


UPSTOX_BASE_URL = os.environ.get("UPSTOX_BASE_URL", "https://api.upstox.com")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
MAX_SYMBOLS = 100
INSTRUMENT_CACHE = {}
INSTRUMENT_MASTER_CACHE = None
INSTRUMENT_MASTER_URLS = (
    "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
    "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
)
DEFAULT_INSTRUMENTS = {
    "RELIANCE": {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE002A01018", "isin": "INE002A01018"},
    "TCS": {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE467B01029", "isin": "INE467B01029"},
    "HDFCBANK": {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE040A01034", "isin": "INE040A01034"},
    "INFY": {"symbol": "INFY", "name": "Infosys", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE009A01021", "isin": "INE009A01021"},
    "ICICIBANK": {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE090A01021", "isin": "INE090A01021"},
    "SBIN": {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "segment": "NSE_EQ", "instrumentType": "EQ", "instrumentKey": "NSE_EQ|INE062A01020", "isin": "INE062A01020"},
}
_ACCESS_TOKEN = None
# Keep enabled while integrating. Set EXPOSE_ERROR_DETAILS=false in production.
EXPOSE_ERROR_DETAILS = os.environ.get("EXPOSE_ERROR_DETAILS", "true").lower() == "true"


class HttpError(Exception):
    def __init__(self, status_code, message, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "access-control-allow-origin": ALLOWED_ORIGIN,
            "access-control-allow-headers": "authorization,content-type",
            "access-control-allow-methods": "GET,OPTIONS",
            "cache-control": "no-store",
            "content-type": "application/json; charset=utf-8",
        },
        "body": json.dumps(body, separators=(",", ":")),
    }


def access_token():
    global _ACCESS_TOKEN
    if _ACCESS_TOKEN:
        return _ACCESS_TOKEN

        secret_arn = os.environ.get("UPSTOX_SECRET_ARN")
    if not secret_arn:
        raise HttpError(500, "UPSTOX_SECRET_ARN is not configured.")

    try:
        import boto3
        from botocore.config import Config

        arn_parts = secret_arn.split(":")
        secret_region = arn_parts[3] if len(arn_parts) > 3 and arn_parts[0] == "arn" else os.environ.get("AWS_REGION")
        if not secret_region:
            raise ValueError("Unable to determine the Secrets Manager region from UPSTOX_SECRET_ARN.")

        secrets = boto3.client(
            "secretsmanager",
            region_name=secret_region,
            config=Config(
                connect_timeout=2,
                read_timeout=3,
                retries={"max_attempts": 1, "mode": "standard"},
            ),
        )
        result = secrets.get_secret_value(SecretId=secret_arn)
        secret = result.get("SecretString")
        if not secret:
            raise ValueError("The secret has no SecretString value.")

        # Supports either a plain token or JSON such as
        # {"UPSTOX_ACCESS_TOKEN":"..."} or {"access_token":"..."}.
        try:
            value = json.loads(secret)
        except json.JSONDecodeError:
            value = secret

        if isinstance(value, dict):
            token = value.get("UPSTOX_ACCESS_TOKEN") or value.get("access_token") or value.get("token")
        else:
            token = value

        if not isinstance(token, str) or not token.strip():
            raise ValueError("The secret does not contain an Upstox access token.")
        _ACCESS_TOKEN = token.strip()
        return _ACCESS_TOKEN
    except HttpError:
        raise
    except Exception as error:
        error_code = getattr(error, "response", {}).get("Error", {}).get("Code")
        detail = {"type": type(error).__name__, "code": error_code, "message": str(error)}
        print(json.dumps({"level": "ERROR", "operation": "secretsmanager:GetSecretValue", **detail}))
        raise HttpError(500, "Unable to load the Upstox token from Secrets Manager.", detail) from error


def upstox(path):
    request = urllib.request.Request(
        f"{UPSTOX_BASE_URL}{path}",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token()}",
            "User-Agent": "PortfolioAI-MarketData/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as upstream:
            payload = json.loads(upstream.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raw_body = error.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw_body)
        except ValueError:
            payload = {}
        errors = payload.get("errors") or []
        message = (errors[0].get("message") if errors and isinstance(errors[0], dict) else None) or payload.get("message") or payload.get("error") or f"Upstox request failed ({error.code})."
        details = {"upstream_status": error.code, "upstream_path": path.split("?")[0], "upstream_body": raw_body[:1000]}
        raise HttpError(502 if error.code == 401 else error.code, message, details) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise HttpError(502, "Unable to reach Upstox.") from error

    if payload.get("status") == "error":
        errors = payload.get("errors") or []
        message = (errors[0].get("message") if errors else None) or payload.get("message") or "Upstox returned an error."
        raise HttpError(502, message, errors)
    return payload


def query(event):
    return event.get("queryStringParameters") or {}


def clean_symbol(value):
    symbol = str(value or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9&._ -]{1,50}", symbol):
        raise HttpError(400, f"Invalid symbol: {value}")
    return symbol


def instrument_master():
    global INSTRUMENT_MASTER_CACHE
    if INSTRUMENT_MASTER_CACHE is not None:
        return INSTRUMENT_MASTER_CACHE

    instruments = []
    for url in INSTRUMENT_MASTER_URLS:
        request = urllib.request.Request(url, headers={"Accept": "application/gzip, application/json", "User-Agent": "PortfolioAI-MarketData/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                raw = response.read()
                rows = json.loads(gzip.decompress(raw).decode("utf-8"))
        except Exception as error:
            raise HttpError(502, "Unable to load the Upstox instrument master.", {"url": url, "type": type(error).__name__, "message": str(error)}) from error

        for item in rows:
            if item.get("segment") not in {"NSE_EQ", "BSE_EQ"}:
                continue
            symbol = str(item.get("trading_symbol") or "").upper()
            if not symbol or not item.get("instrument_key"):
                continue
            normalized = {
                "symbol": symbol,
                "name": item.get("name") or item.get("short_name") or symbol,
                "exchange": item.get("exchange"),
                "segment": item.get("segment"),
                "instrumentType": item.get("instrument_type"),
                "instrumentKey": item.get("instrument_key"),
                "isin": item.get("isin"),
            }
            instruments.append(normalized)
            if item.get("segment") == "NSE_EQ" and symbol not in INSTRUMENT_CACHE:
                INSTRUMENT_CACHE[symbol] = normalized

    INSTRUMENT_MASTER_CACHE = instruments
    return INSTRUMENT_MASTER_CACHE


def search_instruments(text, records=10):
    symbol = clean_symbol(text)
    params = urllib.parse.urlencode(
        {
            "query": symbol,
            "exchanges": "NSE",
            "segments": "EQ",
            "page_number": 1,
            "records": min(max(int(records), 1), 30),
        }
    )
    payload = upstox(f"/v2/instruments/search?{params}")
    return [
        {
            "symbol": item.get("trading_symbol"),
            "name": item.get("name") or item.get("short_name") or item.get("trading_symbol"),
            "exchange": item.get("exchange"),
            "segment": item.get("segment"),
            "instrumentType": item.get("instrument_type"),
            "instrumentKey": item.get("instrument_key"),
            "isin": item.get("isin"),
        }
        for item in payload.get("data", [])
    ]


def resolve_instrument(symbol):
    if symbol in INSTRUMENT_CACHE:
        return INSTRUMENT_CACHE[symbol]
    if symbol in DEFAULT_INSTRUMENTS:
        INSTRUMENT_CACHE[symbol] = DEFAULT_INSTRUMENTS[symbol]
        return INSTRUMENT_CACHE[symbol]
    exact = next((item for item in instrument_master() if item["symbol"] == symbol and item["segment"] == "NSE_EQ"), None)
    if not exact:
        raise HttpError(404, f"No NSE equity instrument found for {symbol}.")
    INSTRUMENT_CACHE[symbol] = exact
    return exact


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_quote(quote, instrument):
    ohlc = quote.get("ohlc") or {}
    previous_close = number(quote.get("prev_close_price", ohlc.get("close")))
    last_price = number(quote.get("last_price"))
    net_change = number(quote.get("net_change"))
    return {
        "symbol": quote.get("symbol") or instrument["symbol"],
        "name": instrument["name"],
        "exchange": instrument["exchange"],
        "instrument_key": quote.get("instrument_token") or instrument["instrumentKey"],
        "price": last_price,
        "previous_close": previous_close,
        "change": net_change if net_change is not None else (last_price - previous_close if last_price is not None and previous_close is not None else None),
        "change_percent": ((last_price - previous_close) / previous_close * 100 if last_price is not None and previous_close and previous_close > 0 else None),
        "open": ohlc.get("open"),
        "high": ohlc.get("high"),
        "low": ohlc.get("low"),
        "volume": quote.get("volume", ohlc.get("volume")),
        "average_price": quote.get("average_price"),
        "year_high": quote.get("year_high"),
        "year_low": quote.get("year_low"),
        "timestamp": quote.get("timestamp"),
        "source": "lambda",
    }


def get_quotes(event):
    raw_symbols = str(query(event).get("symbols", "")).split(",")
    symbols = list(dict.fromkeys(clean_symbol(item) for item in raw_symbols if item.strip()))
    if not symbols:
        raise HttpError(400, "Provide at least one symbol in ?symbols=RELIANCE,TCS.")
    if len(symbols) > MAX_SYMBOLS:
        raise HttpError(400, f"A maximum of {MAX_SYMBOLS} symbols is allowed.")

    instruments = [resolve_instrument(symbol) for symbol in symbols]
    params = urllib.parse.urlencode({"instrument_key": ",".join(item["instrumentKey"] for item in instruments)})
    try:
        payload = upstox(f"/v3/market-quote/quotes?{params}")
        quote_api_version = "v3"
    except HttpError as error:
        if error.status_code != 403:
            raise
        print(json.dumps({"level": "WARNING", "message": "Upstox V3 quotes returned 403; retrying with V2.", "details": error.details}, default=str))
        payload = upstox(f"/v2/market-quote/quotes?{params}")
        quote_api_version = "v2"
    by_symbol = {
        str(item.get("symbol", "")).upper(): item
        for item in (payload.get("data") or {}).values()
    }
    quotes = [normalize_quote(by_symbol[item["symbol"].upper()], item) for item in instruments if item["symbol"].upper() in by_symbol]
    return {"quotes": quotes, "missing": [symbol for symbol in symbols if symbol not in by_symbol], "upstox_api_version": quote_api_version}


def get_details(event):
    symbol = clean_symbol(query(event).get("symbol"))
    result = get_quotes({"queryStringParameters": {"symbols": symbol}})
    if not result["quotes"]:
        raise HttpError(404, f"No quote returned for {symbol}.")
    return result["quotes"][0]


def iso_date(value, fallback):
    result = value or fallback
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", result):
        raise HttpError(400, f"Invalid date: {result}. Use YYYY-MM-DD.")
    try:
        date.fromisoformat(result)
    except ValueError as error:
        raise HttpError(400, f"Invalid date: {result}. Use YYYY-MM-DD.") from error
    return result


def get_historical(event):
    params = query(event)
    symbol = clean_symbol(params.get("symbol"))
    instrument = resolve_instrument(symbol)
    unit = params.get("unit", "days")
    if unit not in {"minutes", "hours", "days", "weeks", "months"}:
        raise HttpError(400, "unit must be minutes, hours, days, weeks, or months.")
    try:
        interval = int(params.get("interval", 1))
    except (TypeError, ValueError) as error:
        raise HttpError(400, "interval must be an integer.") from error
    valid = interval >= 1 and not (unit == "minutes" and interval > 300) and not (unit == "hours" and interval > 5) and not (unit in {"days", "weeks", "months"} and interval != 1)
    if not valid:
        raise HttpError(400, "Invalid interval for the selected unit.")

    to_date = iso_date(params.get("to"), date.today().isoformat())
    from_date = iso_date(params.get("from"), (date.today() - timedelta(days=30)).isoformat())
    if from_date > to_date:
        raise HttpError(400, "from must be earlier than or equal to to.")
    instrument_key = urllib.parse.quote(instrument["instrumentKey"], safe="")
    payload = upstox(f"/v3/historical-candle/{instrument_key}/{unit}/{interval}/{to_date}/{from_date}")
    candles = [
        {
            "timestamp": candle[0],
            "open": candle[1],
            "high": candle[2],
            "low": candle[3],
            "close": candle[4],
            "volume": candle[5],
            "open_interest": candle[6],
        }
        for candle in payload.get("data", {}).get("candles", [])
    ]
    return {"symbol": symbol, "instrument_key": instrument["instrumentKey"], "unit": unit, "interval": interval, "candles": candles, "source": "lambda"}


def search(event):
    params = query(event)
    text = str(params.get("q", "")).strip()
    if len(text) < 2:
        raise HttpError(400, "Search query q must contain at least two characters.")
    try:
        limit = min(max(int(params.get("limit", 12)), 1), 30)
    except (TypeError, ValueError) as error:
        raise HttpError(400, "limit must be an integer.") from error
    exchange = str(params.get("exchange", "ALL")).upper()
    if exchange not in {"ALL", "NSE", "BSE"}:
        raise HttpError(400, "exchange must be ALL, NSE, or BSE.")
    needle = text.upper()
    matches = [item for item in instrument_master() if (exchange == "ALL" or item["exchange"] == exchange) and (needle in item["symbol"] or needle in item["name"].upper())]
    matches.sort(key=lambda item: (not item["symbol"].startswith(needle), item["symbol"] != needle, item["symbol"]))
    return {"instruments": matches[:limit], "source": "lambda"}


def diagnostics():
    checks = {
        "upstox_secret_arn_configured": bool(os.environ.get("UPSTOX_SECRET_ARN")),
        "allowed_origin": ALLOWED_ORIGIN,
        "error_details_enabled": EXPOSE_ERROR_DETAILS,
        "secret_access": False,
        "upstox_connectivity": False,
    }
    try:
        token = access_token()
        checks["secret_access"] = bool(token)
        # Never return the token. A narrow instrument search verifies that the
        # stored token is accepted by Upstox.
        payload = upstox("/v2/instruments/search?query=RELIANCE&exchanges=NSE&segments=EQ&page_number=1&records=1")
        checks["upstox_connectivity"] = payload.get("status") == "success"
        return checks
    except HttpError as error:
        checks["failure"] = {
            "status_code": error.status_code,
            "message": str(error),
            "details": error.details,
        }
        raise HttpError(error.status_code, "Market data diagnostics failed.", checks) from error


def lambda_handler(event, context):
    request_id = getattr(context, "aws_request_id", None)
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")
    if method == "OPTIONS":
        return api_response(204, {})
    try:
        path = str(event.get("rawPath") or event.get("path") or "").rstrip("/")
        if path.endswith("/quotes"):
            data = get_quotes(event)
        elif path.endswith("/search"):
            data = search(event)
        elif path.endswith("/details"):
            data = get_details(event)
        elif path.endswith("/historical"):
            data = get_historical(event)
        elif path.endswith("/diagnostics"):
            data = diagnostics()
        elif path.endswith("/health"):
            data = {"status": "ok"}
        else:
            raise HttpError(404, "Route not found.")
        return api_response(200, {"data": data})
    except HttpError as error:
        log = {"level": "ERROR", "requestId": request_id, "path": event.get("rawPath") or event.get("path"), "message": str(error), "statusCode": error.status_code, "details": error.details}
        print(json.dumps(log, default=str))
        body = {"error": str(error), "request_id": request_id}
        if EXPOSE_ERROR_DETAILS and error.details:
            body["details"] = error.details
        return api_response(error.status_code, body)
    except Exception as error:
        stack = traceback.format_exc()
        print(json.dumps({"level": "ERROR", "requestId": request_id, "path": event.get("rawPath") or event.get("path"), "message": str(error), "type": type(error).__name__, "traceback": stack}))
        public_message = f"{type(error).__name__}: {error}" if EXPOSE_ERROR_DETAILS else "Internal server error."
        body = {"error": public_message, "request_id": request_id}
        if EXPOSE_ERROR_DETAILS:
            body["details"] = {"type": type(error).__name__, "message": str(error), "traceback": stack}
        return api_response(500, body)
