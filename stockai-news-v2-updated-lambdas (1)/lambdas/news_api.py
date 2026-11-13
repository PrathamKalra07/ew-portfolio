"""StockAI S3-backed news API.

Routes (API Gateway HTTP API v2 with Cognito JWT authorizer):
 GET /news/feed?limit=20&cursor=...
 GET /news/watchlists/{watchlist_id}?limit=20&cursor=...
 GET /news/stocks/{instrument_key}?limit=20&cursor=...
 GET /news/stocks/{instrument_key}/sentiment?days=30

S3 producer contract:
 news/feeds/latest/<URL-encoded instrument_key>.json
    {"items": [{"id":"...", "title":"...", "url":"...", "published_at":"...", ...}]}
 news/features/daily/<URL-encoded instrument_key>.json
    {"items": [{"date":"2026-11-05", "provider":"newsdata", "article_count":2,
                 "sentiment_mean":0.3, "gdelt_tone_mean":null}]}
"""
import base64
import json
import logging
import os
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
from db_connect import get_connection

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)
s3 = boto3.client('s3')

BUCKET = os.environ.get('NEWS_BUCKET', '')
FEEDS_PREFIX = os.environ.get('NEWS_FEED_PREFIX', 'news/feeds/latest').strip('/')
FEATURES_PREFIX = os.environ.get('NEWS_FEATURE_PREFIX', 'news/features/daily').strip('/')
MAX_STOCKS = int(os.environ.get('NEWS_API_MAX_STOCKS', '100'))


def respond(status, data):
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Cache-Control': 'private, no-store'},
        'body': json.dumps(data, default=str)
    }


def query_int(value, default, low, high):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, n))


def read_json(key):
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=key)
    except ClientError as exc:
        code = exc.response.get('Error', {}).get('Code', '')
        if code in ('NoSuchKey', '404', 'NotFound'):
            return None
        raise
    return json.loads(obj['Body'].read().decode('utf-8'))


def get_items(data):
    if data is None:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in ('items', 'articles', 'features'):
            if isinstance(data.get(k), list):
                return data[k]
    raise ValueError('Unexpected S3 feed format')


def encode_cursor(offset):
    return base64.urlsafe_b64encode(str(offset).encode()).decode().rstrip('=')


def decode_cursor(cursor):
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor + '=' * (-len(cursor) % 4)).decode()
        value = int(raw)
        if value < 0 or value > 100000:
            raise ValueError()
        return value
    except Exception as exc:
        raise ValueError('Invalid cursor') from exc


def parse_utc(value):
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=timezone.utc)


def get_accessible_instruments(cur, uid, watchlist_id=None, instrument_key=None):
    if watchlist_id is not None:
        cur.execute(
            'SELECT 1 FROM public.watchlists WHERE id=%s AND user_id=%s',
            (watchlist_id, uid)
        )
        if not cur.fetchone():
            return None  # 404, or belongs to another user

    sql = '''SELECT DISTINCT wi.instrument_key
             FROM public.watchlist_items wi
             JOIN public.watchlists w ON w.id=wi.watchlist_id
             WHERE w.user_id=%s'''
    args = [uid]
    if watchlist_id is not None:
        sql += ' AND w.id=%s'
        args.append(watchlist_id)
    if instrument_key is not None:
        sql += ' AND wi.instrument_key=%s'
        args.append(instrument_key)
    sql += ' ORDER BY wi.instrument_key LIMIT %s'
    args.append(MAX_STOCKS + 1)
    cur.execute(sql, args)
    return [row['instrument_key'] for row in cur.fetchall()]


def fetch_feed(keys):
    merged = {}
    for instrument_key in keys:
        key = f'{FEEDS_PREFIX}/{quote(instrument_key, safe="")}.json'
        for article in get_items(read_json(key)):
            if not isinstance(article, dict):
                continue
            article = dict(article)
            article.setdefault('instrument_key', instrument_key)
            article.setdefault('instrument_keys', [instrument_key])
            identity = article.get('url') or article.get('article_url') or article.get('id') or article.get('provider_id')
            if not identity:
                continue
            identity = str(identity)
            if identity in merged:
                existing = merged[identity]
                existing['instrument_keys'] = sorted(set(existing.get('instrument_keys', [])) | {instrument_key})
            else:
                article['instrument_keys'] = sorted(set(article.get('instrument_keys') or []) | {instrument_key})
                merged[identity] = article
    return sorted(merged.values(), key=lambda r: (parse_utc(r.get('published_at')), str(r.get('id', ''))), reverse=True)


def lambda_handler(event, context):
    if not BUCKET:
        log.error('NEWS_BUCKET environment variable missing')
        return respond(500, {'message': 'Server configuration error'})

    request_context = event.get('requestContext') or {}
    if (request_context.get('http') or {}).get('method') != 'GET':
        return respond(405, {'message': 'Method not allowed'})

    claims = (((request_context.get('authorizer') or {}).get('jwt') or {}).get('claims') or {})
    sub = claims.get('sub')
    if not sub:
        return respond(401, {'message': 'Unauthorized'})

    route = event.get('routeKey', '')
    params = event.get('pathParameters') or {}
    query = event.get('queryStringParameters') or {}
    stock = params.get('instrument_key')
    watchlist = params.get('watchlist_id')
    is_sentiment = route == 'GET /news/stocks/{instrument_key}/sentiment'

    valid_routes = {
        'GET /news/feed',
        'GET /news/watchlists/{watchlist_id}',
        'GET /news/stocks/{instrument_key}',
        'GET /news/stocks/{instrument_key}/sentiment'
    }
    if route not in valid_routes:
        return respond(404, {'message': 'Route not found'})
    if route == 'GET /news/watchlists/{watchlist_id}' and watchlist is None:
        return respond(400, {'message': 'Missing watchlist ID'})
    if route.startswith('GET /news/stocks/') and not stock:
        return respond(400, {'message': 'Missing instrument key'})
    if watchlist is not None:
        try:
            watchlist = int(watchlist)
            if watchlist <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return respond(400, {'message': 'Invalid watchlist ID'})

    limit = query_int(query.get('limit'), 20, 1, 50)
    try:
        offset = decode_cursor(query.get('cursor')) if not is_sentiment else 0
    except ValueError:
        return respond(400, {'message': 'Invalid cursor'})

    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id FROM public.user_profiles WHERE cognito_sub=%s', (sub,))
                row = cur.fetchone()
                if not row:
                    return respond(404, {'message': 'User profile not found'})
                keys = get_accessible_instruments(cur, row['id'], watchlist_id=watchlist, instrument_key=stock)
        finally:
            conn.close()

        if keys is None:
            return respond(404, {'message': 'Watchlist not found'})
        if stock and not keys:
            return respond(404, {'message': 'Stock not in your watchlists'})
        if len(keys) > MAX_STOCKS:
            return respond(400, {'message': f'Too many watched stocks for this endpoint (max {MAX_STOCKS})'})

        if is_sentiment:
            days = query_int(query.get('days'), 30, 1, 365)
            key = f'{FEATURES_PREFIX}/{quote(stock, safe="")}.json'
            rows = get_items(read_json(key))
            cutoff = date.today() - timedelta(days=days - 1)
            rows = [r for r in rows if isinstance(r, dict) and
                    isinstance(r.get('date'), str) and r['date'] >= cutoff.isoformat()]
            rows.sort(key=lambda x: x['date'], reverse=True)
            return respond(200, {'instrument_key': stock, 'days': days, 'items': rows})

        all_articles = fetch_feed(keys)
        page = all_articles[offset:offset + limit]
        has_more = offset + limit < len(all_articles)
        return respond(200, {
            'items': page,
            'has_more': has_more,
            'next_cursor': encode_cursor(offset + limit) if has_more else None,
            'total_in_cache': len(all_articles)
        })
    except Exception:
        log.exception('news_api_failed')
        return respond(500, {'message': 'Internal server error'})
