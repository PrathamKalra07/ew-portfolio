# StockAI News v2 — deployable Lambda updates (S3-first)

**Region:** `ap-southeast-2`  |  **Existing stock state machine:** `sync_stocks_data` (do not modify).

## What is included

- **news_catalog**: Reuses existing Aurora watchlists + `news_stock_config`; returns batches of up to 5 verified NewsData market IDs. No article tables in Aurora.
- **newsdata_ingest**: NewsData.io Market News API -> `news/staging/newsdata/YYYY/MM/DD/<uuid>.json` in S3. Requires internet; keep outside Aurora VPC if no NAT.
- **news_index** (REPLACED): After each ingestion batch, normalizes matched articles to immutable S3 JSON under `news/processed/articles/newsdata/...` AND updates `news/feeds/latest/<URL-encoded instrument_key>.json` read by the S3-backed `news_api`. Does NOT use Aurora.
- **gdelt_index** (REPLACED): Normalizes historic GDELT match files into `news/processed/articles/gdelt/...` in S3. No Aurora news tables.
- **news_feature_export** (REPLACED): Builds recent daily sentiment JSON from S3 feed cache under `news/features/daily/<URL-encoded instrument_key>.json`. No Aurora. **This is a rolling UI summary, not a complete historical training feature store.**
- **news_api** (UNCHANGED from your current S3-backed version): `GET /news/feed`, `GET /news/watchlists/{watchlist_id}`, `GET /news/stocks/{instrument_key}`, `GET /news/stocks/{instrument_key}/sentiment`. Queries Aurora for ownership only, and S3 for article feeds.
- **glue/stockai_clean_news.py**: New Glue PySpark job converting S3 normalized NewsData + GDELT to partitioned Parquet for Athena/ML.
- **stepfunctions/news_collection.json**: One **Standard** state machine called `stockai-news-collection` with `evening` and `morning` modes. Reuses existing Lambda names.

## Deploy (existing Lambda functions)

1. Each `deploy/*.zip` contains `lambda_function.py` at ZIP root. Upload to the corresponding existing Lambda (`news_catalog`, `newsdata_ingest`, `news_index`, `gdelt_index`, `news_feature_export`, `news_api`). Set Runtime handler to **`lambda_function.lambda_handler`**. Update from the ZIP to change the code; **do not upload the outer bundle ZIP**.
2. **Do NOT rename/change your `stockai-shared-layer`**. Attach its version (with `db_connect.py`) **only to DB functions**: `news_catalog` and `news_api`. Attach your compatible psycopg2 layer to those functions. Other four Lambdas do not require DB access or the PostgreSQL layer.
3. `news_catalog` and `news_api` need Aurora VPC, Secrets Manager connectivity, correct subnet/SG, S3 endpoint for news_api. Ingest `newsdata_ingest` should stay outside the VPC since it contacts `newsdata.io`.
4. `news_index`, `gdelt_index`, `news_feature_export` can run outside the VPC (no DB needed) and access S3 with IAM. They must not accidentally be in a VPC without an S3 endpoint/NAT.
5. Run `sql/news_stock_config.sql` if you have not already created the stock mapping table. For each watched symbol, configure **verified** `newsdata_market_id` in `news_stock_config`. This table is the only news-related Aurora table used by these Lambdas.
6. Configure `NEWS_BUCKET` as the **bucket name** (e.g. `raw-upstox-historical-data`), NOT its ARN.
7. **Disable any S3 object-created trigger on `news_index`** for the `news/staging/newsdata/` prefix, because the new Step Functions Map invokes it synchronously. Do not trigger the same indexer twice. You can leave a GDELT S3 trigger on `gdelt_index`.
8. Upload Glue script `glue/stockai_clean_news.py` to S3, create a **separate** AWS Glue PySpark job named `stockai-clean-news` (Python 3, Glue 5/6 where supported) and set job parameters:
   - `--INPUT_PATH` = `s3://YOUR_BUCKET/news/processed/articles/`
   - `--OUTPUT_PATH` = `s3://YOUR_BUCKET/news/analytics/articles/`
   IAM: `s3:GetObject`, `s3:ListBucket` input; `s3:PutObject`, `s3:DeleteObject` output; normal Glue runtime permissions.
9. Create/update **Standard** Step Functions state machine `stockai-news-collection` from `stepfunctions/news_collection.json`. It sequentially processes max 20 batches x 5 stocks (controlled by `MAX_BATCHES_PER_RUN=20` in `news_catalog`) with `max_pages=1` per batch. Evening mode runs ingestion + feed indexing. Morning also runs Glue **once** and exports daily sentiment JSON after ingestion.
10. Create **two** EventBridge Scheduler schedules in timezone **Asia/Kolkata**, flexible time window **Off**, target **same** state machine:
    - `stockai-news-evening`: `cron(0 18 * * ? *)`, input `{"mode":"evening"}`
    - `stockai-news-morning`: `cron(0 5 * * ? *)`, input `{"mode":"morning"}`
   EventBridge Scheduler's IAM execution role needs `states:StartExecution` on this state machine. The state machine execution role needs `lambda:InvokeFunction` on 4 functions (`news_catalog`, `newsdata_ingest`, `news_index`, `news_feature_export`) plus `glue:StartJobRun`, `glue:GetJobRun`, `glue:GetJobRuns`, `glue:BatchStopJobRun` on `stockai-clean-news`.
11. Run a manual morning execution with `{"mode":"morning"}`. Verify `news/staging/newsdata/`, then `news/processed/articles/newsdata/`, then `news/feeds/latest/`, Glue output `news/analytics/articles/`, and `news/features/daily/`. News UI should now display indexed articles via existing Cognito routes.
12. **6 AM ML**: This package stops after news feature export. Your ML inference Lambda/model and as-of feature builder are not yet implemented, so **do not schedule a fake model prediction**. When implemented, append `stockai-build-features` Glue `.sync` and an inference Task *after* `ExportNewsFeatures` in the morning state machine, so it only predicts after ingestion/cleaning finishes. A separate 6 AM schedule can race with Glue; prefer chaining and set an operational deadline alert.

## Environment and IAM checklist

| Lambda | Environment | Network | IAM |
|---|---|---|---|
| news_catalog | `DB_HOST`, `DB_NAME`, `DB_SECRET_ARN`, optional `DB_PORT`, `MAX_BATCHES_PER_RUN=20` | Aurora VPC | secretsmanager:GetSecretValue for DB secret |
| newsdata_ingest | `NEWS_BUCKET`, `NEWSDATA_SECRET_ARN` | Outside VPC / NAT | GetSecretValue for NewsData key; S3 PutObject staging |
| news_index | `NEWS_BUCKET`, optional `NEWS_FEED_PREFIX`, `NEWS_NORMALIZED_PREFIX`, `NEWS_FEED_MAX_ITEMS` | Outside VPC / S3 access | S3 GetObject staging+feeds; PutObject feeds+normalized |
| gdelt_index | `NEWS_BUCKET` | Outside VPC / S3 access | S3 GetObject GDELT staging; PutObject normalized GDELT |
| news_feature_export | `NEWS_BUCKET`, optional `NEWS_FEED_PREFIX`,`NEWS_FEATURE_PREFIX` | Outside VPC / S3 access | S3 GetObject feeds; PutObject features |
| news_api | `NEWS_BUCKET`, `DB_HOST`, `DB_NAME`,`DB_SECRET_ARN`, optional `DB_PORT`,`NEWS_FEED_PREFIX`,`NEWS_FEATURE_PREFIX` | Aurora VPC | GetSecretValue; S3 GetObject feeds + features |

For S3 `HeadObject`/`GetObject` missing-file handling, use `s3:ListBucket` on the bucket to receive 404 on absent keys rather than 403. The UI feed can still legitimately be empty until articles are indexed and associated with stocks.

## Limitations, deliberately visible

- **NewsData Free is delayed** and page/credit-limited. One page per batch is a sampling strategy, not complete event capture; log `coverage_complete` and do not treat missing coverage as zero news activity. Two collection runs usually use <= 40 request credits with the 20-batch cap (subject to actual provider billing/pagination). Any extra watched stocks beyond cap are deferred until you add rotation/pagination.
- A batch may return stories for other names; the indexer conservatively maps only explicit reported symbols or long exact company names in titles. Some news will be missed rather than falsely attributed.
- S3 `news/feeds/latest/` is a **bounded rolling cache (200 articles/stock)**. The news sentiment endpoint therefore returns a *partial* rolling series up to 365 days, not complete historical training features. Use historical Parquet + an as-of aggregation job for training.
- GDELT historical company matches are candidate mappings, not validated articles. GDELT tone and NewsData sentiment are **not comparable** and must remain separate ML features.
- The Glue job currently performs a **full overwrite** once per morning run. Keep only one morning execution in flight; add idempotent execution locking and incremental partition updates before scaling.
- Stock-specific article data belongs in S3; only auth/watchlists/mapping remain in Aurora. This starter does not require `news_articles` or `news_article_stocks`.
- This pipeline is **not** an end-to-end ML prediction system. A production-grade feature join must enforce timestamps/availability and avoid news published or retrieved after the prediction cutoff.
- Verify NewsData licensing for commercial use, content retention and derived ML datasets before production.
