import json
import unittest

import lambda_function


class MarketDataLambdaTests(unittest.TestCase):
    def test_normalizes_quote_for_frontend(self):
        quote = lambda_function.normalize_quote(
            {"symbol": "RELIANCE", "instrument_token": "NSE_EQ|INE002A01018", "last_price": 1500, "prev_close_price": 1475, "net_change": 25, "volume": 100, "ohlc": {"open": 1480, "high": 1510, "low": 1470}},
            {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "instrumentKey": "NSE_EQ|INE002A01018"},
        )
        self.assertEqual(quote["price"], 1500)
        self.assertEqual(quote["previous_close"], 1475)
        self.assertEqual(quote["source"], "lambda")
        self.assertAlmostEqual(quote["change_percent"], 1.694915, places=5)

    def test_rejects_unsafe_symbols(self):
        with self.assertRaises(lambda_function.HttpError):
            lambda_function.clean_symbol("<script>")

    def test_health_route(self):
        result = lambda_function.lambda_handler({"rawPath": "/health", "requestContext": {"http": {"method": "GET"}}}, None)
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(json.loads(result["body"])["data"]["status"], "ok")


if __name__ == "__main__":
    unittest.main()
