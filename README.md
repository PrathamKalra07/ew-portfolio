# Portfolio Manager

Vite + React + Tailwind reconstruction of the supplied portfolio sign-in page.

## Run locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and replace the placeholder Cognito values before starting Vite:

```env
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

The custom sign-in UI uses Amplify Auth with your existing Cognito User Pool. Use a Cognito app client without a client secret because browser applications cannot safely hold one.

After authentication, the app restores the Amplify session and opens a full stock-prediction workspace:

- Overview with movers, cumulative results, and AI recommendations
- Portfolio holdings, positions, allocation, and buy/sell actions
- Research with historical OHLCV data and candlestick charts
- Settings with the existing profile, Cognito invite, and team-user APIs

Set `VITE_MARKET_DATA_PROVIDER=appsync` or `upstox` to consume the Fargate Upstox feed. During NSE market hours the browser connects once to `/market/nse`, unpacks the published `stocks` batches, and shows only the symbols in the user's watchlist. Outside market hours it calls `GET /market/quotes?symbols=...` through `VITE_API_BASE_URL` for a Lambda-backed Upstox REST snapshot. `VITE_MARKET_API_URL` remains available as an optional market-only override.

The Fargate task still controls the upstream Upstox subscription. Set its `STOCK_SYMBOLS` environment variable (for example `RELIANCE,TCS,INFY`) to the same list to avoid subscribing to every NSE equity. Changing that ECS environment variable requires a new task/deployment; the browser setting only filters the already-published AppSync batch.

## Frontend architecture

- `App.jsx` delegates only to the route table in `AppRoutes.jsx`.
- `AuthContext` owns Cognito session state and route protection.
- `MarketDataContext` owns the single AppSync subscription and exposes quotes globally through `useMarketData()`.
- `Dashboard` is the authenticated layout; routed pages render through its outlet.
- Green **Fargate · Live** badges identify market-hours WebSocket data.
- Blue **Lambda · REST** badges identify API Gateway/Lambda data.
- Orange **Demo** badges identify generated or dummy values that are not production data.

Create a production build with:

```bash
npm run build
```
