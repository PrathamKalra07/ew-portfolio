"""AWS Glue PySpark: normalize NewsData/GDELT candidate records to historical Parquet.
Job parameters:
 --INPUT_PATH=s3://BUCKET/news/processed/articles/
 --OUTPUT_PATH=s3://BUCKET/news/analytics/articles/
This is separate from the cached JSON feeds used by news_api.
Full overwrite: ensure only one scheduled Glue run writes to this prefix.
"""
import sys
from awsglue.utils import getResolvedOptions
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.window import Window

args=getResolvedOptions(sys.argv,['INPUT_PATH','OUTPUT_PATH'])
spark=SparkSession.builder.getOrCreate()
raw=(spark.read.option('multiLine','true').option('recursiveFileLookup','true')
     .json(args['INPUT_PATH']))
if 'items' not in raw.columns:
    raise ValueError('No normalized items array found. Run news_index/gdelt_index first.')
items=raw.select(F.explode('items').alias('a')).select('a.*')
for name,dtype in [('id','string'),('provider','string'),('url','string'),
                   ('title','string'),('description','string'),('source_name','string'),
                   ('published_at','string'),('ingested_at','string'),
                   ('sentiment_label','string'),('gdelt_tone','double'),
                   ('instrument_keys','array<string>'),('date_precision','string')]:
    if name not in items.columns:
        items=items.withColumn(name,F.lit(None).cast(dtype))
items=(items
    .withColumn('published_ts',F.to_timestamp('published_at'))
    .withColumn('ingested_ts',F.to_timestamp('ingested_at'))
    .withColumn('event_date',F.to_date('published_ts'))
    .withColumn('gdelt_tone',F.col('gdelt_tone').cast('double'))
    .filter(F.col('url').isNotNull() & F.col('published_ts').isNotNull()))
# One latest version per provider + provider ID; do not silently combine providers.
w=Window.partitionBy('provider','id').orderBy(F.col('ingested_ts').desc_nulls_last())
items=items.withColumn('rn',F.row_number().over(w)).filter('rn = 1').drop('rn')
items=(items.withColumn('year',F.year('event_date'))
    .select('id','provider','url','title','description','source_name','published_ts',
            'ingested_ts','event_date','sentiment_label','gdelt_tone','instrument_keys',
            'date_precision','year'))
items.write.mode('overwrite').partitionBy('provider','year').parquet(args['OUTPUT_PATH'])
print('News normalized and written to',args['OUTPUT_PATH'])
