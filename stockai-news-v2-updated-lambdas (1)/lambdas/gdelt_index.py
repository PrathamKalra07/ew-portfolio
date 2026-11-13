"""Normalize historical GDELT candidate matches to S3, no Aurora news tables.
Event can be {s3_key:'news/staging/gdelt/...json'} or a single S3 event.
Historical matching/tone is provisional and must be validated for Indian stocks.
"""
import os,json,hashlib
from urllib.parse import unquote_plus
from datetime import datetime,timezone
import boto3
s3=boto3.client('s3')
BUCKET=os.environ['NEWS_BUCKET']

def lambda_handler(event,context):
    paths = [event['s3_key']] if event.get('s3_key') else [unquote_plus(r['s3']['object']['key']) for r in event.get('Records',[]) if r.get('eventSource')=='aws:s3']
    total=0
    for key in paths:
        if not key.startswith('news/staging/gdelt/'):
            continue
        doc=json.loads(s3.get_object(Bucket=BUCKET,Key=key)['Body'].read())
        items=[]
        for a in doc.get('articles',[]):
            url=a.get('url')
            if not url: continue
            items.append({'id':a.get('provider_id') or hashlib.sha256(url.encode()).hexdigest(),
              'provider':'gdelt','url':url, 'published_at':a.get('published_at'),
              'gdelt_tone':a.get('tone'), 'instrument_keys':a.get('instrument_keys') or [],
              'date_precision':'day', 'ingested_at':datetime.now(timezone.utc).isoformat()})
        out='news/processed/articles/gdelt/'+key.removeprefix('news/staging/gdelt/')
        s3.put_object(Bucket=BUCKET,Key=out,Body=json.dumps({'provider':'gdelt','items':items}).encode(),ContentType='application/json')
        total+=len(items)
    return {'normalized_events':total}
