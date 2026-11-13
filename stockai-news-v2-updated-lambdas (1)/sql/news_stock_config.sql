-- Only this mapping table is required in Aurora for news collection.
-- User watchlists remain in user_profiles/watchlists/watchlist_items.
CREATE TABLE IF NOT EXISTS public.news_stock_config (
  instrument_key VARCHAR(100) PRIMARY KEY,
  trading_symbol VARCHAR(100) NOT NULL,
  stock_name VARCHAR(255) NOT NULL,
  newsdata_market_id VARCHAR(150),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add provider-verified market identifiers before scheduling collection.
-- Example only; verify your NewsData account recognizes the market identifier:
-- INSERT INTO public.news_stock_config
-- (instrument_key,trading_symbol,stock_name,newsdata_market_id)
-- VALUES ('NSE_EQ|INE002A01018','RELIANCE','Reliance Industries Limited','RELIANCE-IN-NSE')
-- ON CONFLICT (instrument_key) DO UPDATE SET newsdata_market_id=EXCLUDED.newsdata_market_id;
