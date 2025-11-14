# How to Check Backend Runtime Logs

## What You've Provided
The logs you shared are **build logs** showing the Docker image was built successfully. We now need to check the **runtime logs** to confirm the backend service is actually running.

## Where to Find Runtime Logs in Northflank

1. Go to your **backend-api** service in Northflank
2. Navigate to **Logs** or **Runtime Logs** (not Build Logs)
3. Look for logs that show the application starting up

## What to Look For - Success Indicators ✅

### 1. Environment Validation
You should see:
```
[INFO] Environment validation: 20/20 required variables are set
```
OR
```
[INFO] Environment variables validated successfully
```

### 2. Supabase JWT Secret Loaded
You should see:
```
[INFO] Supabase JWT Secret loaded { length: 88, isValidBase64: true, expectedLength: '64-128 characters (typically 88 for base64-encoded)' }
```

### 3. Database Initialization
You should see:
```
[INFO] Database pool initialized
```

### 4. Redis Connection
You should see:
```
[INFO] Redis client connected
```

### 5. Server Started
You should see:
```
[INFO] Server running on port 3000 in production mode
```
(Or whatever PORT is configured)

### 6. Background Services Started
You should see:
```
[INFO] Starting AI Engine service...
[INFO] Starting Market Data service...
[INFO] Starting Subscription Monitor service...
```

## What to Look For - Error Indicators ❌

### If JWT Secret is Missing:
```
[WARN] SUPABASE_JWT_SECRET is not set. Authentication will fail until this is configured.
[ERROR] Missing required environment variables: SUPABASE_JWT_SECRET
```

### If JWT Secret Format is Wrong:
```
[WARN] Supabase JWT Secret contains non-base64 characters. This may cause JWT verification to fail.
```

### If Server Failed to Start:
```
[ERROR] Failed to start server: ...
Process terminated with exit code 1
```

## Quick Health Check

Once you see the server is running, you can also verify by checking the health endpoint:

```bash
curl https://p01--backend-api--sg8rdlcdjdjw.code.run/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T13:15:47.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

## Next Steps

1. **Check Runtime Logs**: Look for the success indicators above
2. **Verify JWT Secret**: Confirm you see "Supabase JWT Secret loaded" with length 88
3. **Check Server Status**: Confirm "Server running on port..." appears
4. **If all good**: Proceed to check web dashboard logs

## If You See Errors

- **Missing SUPABASE_JWT_SECRET**: Check environment variables in Northflank
- **Database connection errors**: Check PostgreSQL connection settings
- **Redis connection errors**: Check Redis connection settings
- **Port conflicts**: Check PORT environment variable

