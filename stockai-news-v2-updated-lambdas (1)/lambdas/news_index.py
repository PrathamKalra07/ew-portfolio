"""NewsData raw S3 batch -> normalized S3 + per-stock UI feed.
Called SYNCHRONOUSLY by the Step Functions Map (MaxConcurrency=1).
Do NOT also enable an S3 event notification for this same function.
No Aurora dependency, no db_connect layer needed.
"""
import json
import os
import hashlib
import logging
from datetime import datetime, timezone
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)
s3 = boto3.client('s3')
BUCKET = os.environ['NEWS_BUCKET']
FEED_PREFIX = os.environ.get('NEWS_FEED_PREFIX', 'news/feeds/latest').strip('/')
CLEAN_PREFIX = os.environ.get('NEWS_NORMALIZED_PREFIX', 'news/processed/articles/newsdata').strip('/')
FEED_LIMIT = int(os.environ.get('NEWS_FEED_MAX_ITEMS', '200'))


def read_optional(key):
    try:
        return json.loads(s3.get_object(Bucket=BUCKET, Key=key)['Body'].read())
    except ClientError as exc:
        if exc.response.get('Error', {}).get('Code') in ('NoSuchKey','404','NotFound'):
            return None
        raise


def put_json(key, payload):
    s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(payload, ensure_ascii=False).encode('utf-8'), ContentType='application/json')


def utc_timestamp(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace('Z','+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def symbols_in(article):
    raw = article.get('symbol') or []
    if isinstance(raw, (str, dict)):
        raw = [raw]
    found = set()
    for x in raw if isinstance(raw,list) else []:
        if isinstance(x,str):
            found.add(x.upper())
        elif isinstance(x,dict):
            for name in ('symbol','market_id','ticker','name'):
                if x.get(name):
                    found.add(str(x[name]).upper())
    return found


def matching_stocks(article, stocks):
    symbols = symbols_in(article)
    # Prefer explicit provider symbol / market ID matches. Avoid attributing every
    # story to every stock in a batched request.
    matches = []
    for stock in stocks:
        ids = {str(stock.get('market_id','')).upper(), str(stock.get('trading_symbol','')).upper()}
        if symbols and any(v and v in symbols for v in ids):
            matches.append(stock['instrument_key'])
    if matches:
        return sorted(set(matches))
    # Only fallback on distinct multiword long company names in the headline.
    # No match is better than a false-positive stock sentiment label.
    title = str(article.get('title') or '').casefold()
    for stock in stocks:
        name = str(stock.get('stock_name') or '').strip().casefold()
        if len(name) >= 10 and ' ' in name and name in title:
            matches.append(stock['instrument_key'])
    return sorted(set(matches))


def lambda_handler(event, context):
    key = event.get('s3_key')
    if not key or not key.startswith('news/staging/newsdata/'):
        raise ValueError('Expected s3_key in news/staging/newsdata/')
    doc = read_optional(key)
    if not doc:
        raise ValueError('Raw news object not found: '+key)
    now = datetime.now(timezone.utc).isoformat()
    stocks = doc.get('stocks') or []
    clean = []
    per_stock = {}
    for a in doc.get('articles') or []:
        if not isinstance(a, dict) or not a.get('link') or not a.get('pubDate'):
            continue
        published = utc_timestamp(a.get('pubDate'))
        if not published:
            continue
        associated = matching_stocks(a, stocks)
        if not associated:
            continue
        id_ = str(a.get('article_id') or hashlib.sha256(a['link'].encode('utf-8')).hexdigest())
        record = {
            'id': id_, 'provider': 'newsdata', 'title': a.get('title'),
            'description': a.get('description'), 'url': a['link'],
            'image_url': a.get('image_url'), 'source_name': a.get('source_name'),
            'published_at': published, 'ingested_at': now,
            'sentiment_label': a.get('sentiment') if isinstance(a.get('sentiment'), str) else None,
            'instrument_keys': associated,
        }
        clean.append(record)
        for instrument in associated:
            per_stock.setdefault(instrument, []).append({**record, 'instrument_key': instrument})
    # Retain a dated, immutable normalization output for Glue/Athena.
    normalized_key = CLEAN_PREFIX+'/'+key.removeprefix('news/staging/newsdata/')
    put_json(normalized_key, {'provider':'newsdata', 'items':clean,
                              'source_key':key, 'coverage_complete':doc.get('coverage_complete',False)})
    for instrument, incoming in per_stock.items():
        feed_key = f'{FEED_PREFIX}/{quote(instrument, safe="")}.json'
        old = read_optional(feed_key) or {}
        existing = old.get('items',[]) if isinstance(old,dict) else []
        merged = {str(a.get('url') or a.get('id')):a for a in existing if isinstance(a,dict) and (a.get('url') or a.get('id'))}
        for a in incoming:
            merged[str(a.get('url') or a.get('id'))] = a
        result = sorted(merged.values(), key=lambda a:a.get('published_at') or '', reverse=True)[:FEED_LIMIT]
        put_json(feed_key, {'items':result, 'updated_at':now,
                            'coverage_complete':bool(doc.get('coverage_complete',False)),
                            'note':'Collection coverage depends on provider pagination and delay'})
    log.info('Indexed %d normalized articles for %d stocks',len(clean),len(per_stock))
    return {'normalized_s3_key':normalized_key,'articles_matched':len(clean),'stocks_updated':len(per_stock)}
