"""Outside VPC: NewsData Market API -> S3 ingestion event.
No Aurora connectivity required. One Step Functions Map item = up to five verified IDs.
"""
import os,json,boto3,uuid,hashlib
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from datetime import datetime,timezone

s3=boto3.client('s3')
secrets=boto3.client('secretsmanager')

def secret_key():
    v=secrets.get_secret_value(SecretId=os.environ['NEWSDATA_SECRET_ARN'])['SecretString']
    try:
        d=json.loads(v)
        if isinstance(d,dict): return d.get('api_key') or d.get('apikey') or d['NEWS_API_KEY']
        if isinstance(d,str): return d
    except json.JSONDecodeError: pass
    return v.strip()

def lambda_handler(event,context):
    stocks=event.get('stocks',[])
    if not 1<=len(stocks)<=5: raise ValueError('stocks must contain 1-5 verified instruments')
    ids=[s['market_id'] for s in stocks]
    key=secret_key()
    max_pages=min(int(event.get('max_pages',1)),10)
    pages=[]; next_page=None; complete=False
    for page_number in range(max_pages):
        params={'market_id':','.join(ids),'language':'en','size':10,'removeduplicate':1}
        if next_page: params['page']=next_page
        # Don't log the key or full URL; it contains credentials.
        url='https://newsdata.io/api/1/market?'+urlencode({**params,'apikey':key})
        try:
            with urlopen(Request(url,headers={'User-Agent':'StockAI/1.0'}),timeout=20) as r:
                payload=json.load(r)
        except HTTPError as ex:
            raise RuntimeError(f'NewsData HTTP {ex.code}') from None
        if payload.get('status')!='success':
            raise RuntimeError('NewsData API returned error: '+str(payload.get('code','unknown')))
        pages.extend(payload.get('results') or [])
        next_page=payload.get('nextPage')
        if not next_page:
            complete=True; break
    # Article/provider metadata only; no full-text archive (respect licensing).
    result=[]
    for a in pages:
        result.append({k:a.get(k) for k in ('article_id','title','link','source_name','description','image_url','pubDate','sentiment','symbol','duplicate')})
    doc={'provider':'newsdata','fetched_at':datetime.now(timezone.utc).isoformat(),
         'stocks':stocks,'articles':result,'coverage_complete':complete,'pages_fetched':min(max_pages,page_number+1),
         'next_page_available':bool(next_page)}
    outkey='news/staging/newsdata/'+datetime.now(timezone.utc).strftime('%Y/%m/%d/')+uuid.uuid4().hex+'.json'
    s3.put_object(Bucket=os.environ['NEWS_BUCKET'],Key=outkey,Body=json.dumps(doc).encode(),ContentType='application/json')
    return {'status':'stored','s3_key':outkey,'articles':len(result),'coverage_complete':complete}
