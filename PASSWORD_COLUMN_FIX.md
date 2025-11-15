# Fix: Password Column NOT NULL Constraint Error

## Problem Identified

The error logs revealed the actual issue:

```
null value in column "password" of relation "users" violates not-null constraint
```

**Root Cause:** The `users` table has a `password` column with a NOT NULL constraint, but when creating users via Supabase authentication, no password is provided (since Supabase handles authentication externally).

## Solution

### 1. Database Schema Fix

Added a migration in `backend-services/src/database/pool.js` to make the `password` column nullable:

```javascript
// Make password column nullable for Supabase-authenticated users
// Supabase handles authentication, so we don't store passwords for Supabase users
await client.query(`
  ALTER TABLE public.users 
  ALTER COLUMN password DROP NOT NULL
`).catch(err => {
  // Column might not exist, which is fine - we only need to modify it if it exists
  if (err.code !== '42703') { // 42703 = undefined_column
    throw err;
  }
});
```

This migration:
- Removes the NOT NULL constraint from the `password` column
- Allows NULL passwords for Supabase-authenticated users
- Handles the case where the column doesn't exist (for new databases)

### 2. Improved Error Handling

Enhanced error handling to preserve the column name through the error chain:
- The error now includes `error.column` and `error.originalError` properties
- Better extraction of column names from PostgreSQL errors
- More detailed logging for debugging

## Deployment Steps

1. **Deploy the updated code** - The migration will run automatically on next startup
2. **Verify the migration** - Check that the password column is now nullable:
   ```sql
   SELECT column_name, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'password';
   ```
   Should show: `is_nullable = 'YES'`

3. **Test Supabase login** - The endpoint should now work correctly

## Manual Fix (If Needed)

If you need to apply the fix manually without deploying:

```sql
ALTER TABLE public.users 
ALTER COLUMN password DROP NOT NULL;
```

## Why This Happened

The database schema was likely created with a `password` column for traditional email/password authentication. When Supabase authentication was added, the schema wasn't updated to allow NULL passwords for Supabase-authenticated users.

## Verification

After the fix, Supabase login should work without errors. The `password` column will be NULL for Supabase-authenticated users, which is correct since Supabase handles authentication externally.

## Related Files

- `backend-services/src/database/pool.js` - Schema initialization and migration
- `backend-services/src/routes/auth.js` - User creation logic and error handling

