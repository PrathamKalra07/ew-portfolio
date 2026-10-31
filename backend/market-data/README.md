# Market data Lambda

Python Lambda REST facade used by the React app for non-streaming Upstox data. It uses only Python's standard library, so the deployment package has no third-party dependencies.

## Routes

- `GET /market/quotes?symbols=RELIANCE,TCS` — batch quote snapshot
- `GET /market/search?q=reliance&limit=10` — NSE equity search
- `GET /market/details?symbol=RELIANCE` — full normalized quote
- `GET /market/historical?symbol=RELIANCE&unit=days&interval=1&from=2026-09-01&to=2026-10-29`
- `GET /market/diagnostics` — authenticated Secrets Manager and Upstox connectivity check
- `GET /market/health` — unauthenticated health check

All market routes use the API Gateway Cognito JWT authorizer. The Lambda resolves trading symbols to Upstox instrument keys and caches those resolutions for the lifetime of a warm invocation.

Search uses Upstox's public NSE and BSE instrument-master JSON files and caches them for the lifetime of the warm Lambda. This avoids the authenticated beta Instrument Search endpoint.

## Deploy

```powershell
cd backend/market-data
sam build
sam deploy --guided
```

Provide the Cognito User Pool ARN, Cognito client ID, the ARN of the Secrets Manager secret containing the Upstox Analytics Token, and the exact frontend origin. After deployment, copy the `MarketDataApiUrl` output into `VITE_MARKET_API_URL` and rebuild the frontend.

The secret can be the raw token string or JSON using one of these keys: `UPSTOX_ACCESS_TOKEN`, `access_token`, or `token`. Lambda receives only the secret ARN and is granted `secretsmanager:GetSecretValue` for that specific secret.

`ExposeErrorDetails` defaults to `true` while integrating. This returns the underlying exception type/message and a CloudWatch request ID to the frontend. Set it to `false` for production; full tracebacks remain available in the Lambda CloudWatch log group.
