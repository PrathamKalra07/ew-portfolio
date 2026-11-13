"""Export rolling per-stock daily news features from S3 cached feeds to S3.
Run once after the morning news ingestion/indexing Map has completed.
Provider sentiment may be absent; null means unknown, not neutral.
"""
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from urllib.parse import quote
from zoneinfo import ZoneInfo

import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
BUCKET = os.environ['NEWS_BUCKET']
FEED_PREFIX = os.environ.get('NEWS_FEED_PREFIX','news/feeds/latest').strip('/')
FEATURE_PREFIX = os.environ.get('NEWS_FEATURE_PREFIX','news/features/daily').strip('/')
SCORE = {'positive':1.0,'neutral':0.0,'negative':-1.0}
IST=ZoneInfo('Asia/Kolkata')


def read_optional(key):
    try:
        return json.loads(s3.get_object(Bucket=BUCKET,Key=key)['Body'].read())
    except ClientError as exc:
        if exc.response.get('Error',{}).get('Code') in ('NoSuchKey','404','NotFound'):
            return None
        raise


def lambda_handler(event,context):
    batches=event.get('batches') or []
    instruments=sorted(set(s['instrument_key'] for batch in batches for s in batch))
    exported=0
    now=datetime.now(timezone.utc).isoformat()
    for instrument in instruments:
        encoded=quote(instrument,safe='')
        feed=read_optional(f'{FEED_PREFIX}/{encoded}.json') or {}
        by_day=defaultdict(list)
        for a in feed.get('items') or []:
            stamp=a.get('published_at')
            if not stamp: continue
            try: day=datetime.fromisoformat(stamp.replace('Z','+00:00')).astimezone(IST).date().isoformat()
            except (TypeError,ValueError): continue
            by_day[day].append(a)
        rows=[]
        for day, articles in sorted(by_day.items()):
            labeled=[SCORE[a.get('sentiment_label','').lower()] for a in articles if str(a.get('sentiment_label','')).lower() in SCORE]
            rows.append({'date':day,'provider':'newsdata','article_count':len(articles),
                         'positive_count':sum(str(a.get('sentiment_label','')).lower()=='positive' for a in articles),
                         'negative_count':sum(str(a.get('sentiment_label','')).lower()=='negative' for a in articles),
                         'sentiment_mean':sum(labeled)/len(labeled) if labeled else None,
                         'gdelt_tone_mean':None, 'sentiment_sample_size':len(labeled)})
        key=f'{FEATURE_PREFIX}/{encoded}.json'
        s3.put_object(Bucket=BUCKET,Key=key,Body=json.dumps({'items':rows,'generated_at':now,
          'coverage_note':'Rolling feed cache only; may be incomplete; use Athena historical Parquet for full training'}).encode(),ContentType='application/json')
        exported+=1
    return {'stocks_exported':exported,'feature_prefix':FEATURE_PREFIX}
