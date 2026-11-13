"""VPC Lambda: return distinct watched instruments and verified NewsData market IDs.
Configure missing market IDs in news_stock_config manually after verifying them with NewsData.
"""
import os
from db_connect import connect_db

def lambda_handler(event, context):
    conn=connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute('''SELECT DISTINCT wi.instrument_key, c.trading_symbol, c.stock_name,c.newsdata_market_id
               FROM watchlist_items wi JOIN news_stock_config c ON c.instrument_key=wi.instrument_key
               WHERE c.enabled=TRUE AND c.newsdata_market_id IS NOT NULL
               ORDER BY wi.instrument_key''')
            rows=cur.fetchall()
        stocks=[{'instrument_key':a,'trading_symbol':b,'stock_name':c,'market_id':d} for a,b,c,d in rows]
        batches=[stocks[i:i+5] for i in range(0,len(stocks),5)]
        max_batches=int(os.environ.get("MAX_BATCHES_PER_RUN","20"))
        batches=batches[:max_batches]
        return {'batches':batches,'stock_count':len(stocks),'scheduled_stock_count':sum(map(len,batches)),
                'truncated':len(stocks)>sum(map(len,batches))}
    finally: conn.close()
