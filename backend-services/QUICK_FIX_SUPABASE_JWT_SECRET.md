# ⚠️ QUICK FIX: SUPABASE_JWT_SECRET Issue

## 🔍 Problem Identified

Based on the logs, your deployment is finding a variable named **`SUPABASE_JWT_SECRE`** (missing the final 'T'), but the application expects **`SUPABASE_JWT_SECRET`** (with the 'T').

**Log Evidence:**
```
Related environment variables found: SUPABASE_URL, JWT_SECRET, SUPABASE_JWT_SECRE
```

Notice: `SUPABASE_JWT_SECRE` (20 characters) vs `SUPABASE_JWT_SECRET` (21 characters)

## ✅ Solution

### Option 1: Rename the Variable in Northflank (Recommended)

1. **Go to Northflank Dashboard**
   - Navigate to your service/project
   - Go to **Settings** → **Environment Variables**

2. **Find the Variable**
   - Look for a variable named `SUPABASE_JWT_SECRE` (or similar)
   - Check if it has the correct value

3. **Rename the Variable**
   - **Delete** the incorrectly named variable (`SUPABASE_JWT_SECRE`)
   - **Create a new variable** with the exact name: `SUPABASE_JWT_SECRET`
   - **Copy the value** from the old variable to the new one
   - **Save** the changes

4. **Redeploy**
   - Trigger a new deployment
   - The application should now start successfully

### Option 2: Verify the Variable Name

1. **Check the Exact Variable Name**
   - In Northflank, go to **Settings** → **Environment Variables**
   - Look for any variable containing "SUPABASE" and "JWT"
   - Verify the exact spelling:
     - ✅ Correct: `SUPABASE_JWT_SECRET`
     - ❌ Incorrect: `SUPABASE_JWT_SECRE` (missing T)
     - ❌ Incorrect: `SUPABASE_JWT_SECRETS` (extra S)
     - ❌ Incorrect: `SUPABASE_JWT_SECRET ` (trailing space)

2. **Check for Hidden Characters**
   - Copy the variable name from Northflank
   - Paste it into a text editor
   - Check if there are any:
     - Leading/trailing spaces
     - Special characters
     - Non-visible characters

## 📋 Verification Steps

After fixing, you should see in the logs:
```
[INFO] Environment validation: 20/20 required variables are set
[INFO] Environment variables validated successfully
```

Instead of:
```
[ERROR] Missing: SUPABASE_JWT_SECRET
```

## 🔍 Where to Get the Value

If you need to set the value:

1. Go to **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Scroll to **JWT Settings**
4. Copy the **JWT Secret** value
5. Paste it as the value for `SUPABASE_JWT_SECRET` in Northflank

## ⚠️ Common Issues

1. **Variable Name Typo**
   - The variable is named `SUPABASE_JWT_SECRE` instead of `SUPABASE_JWT_SECRET`
   - **Fix:** Rename to exactly `SUPABASE_JWT_SECRET`

2. **Extra Spaces**
   - Variable name has leading/trailing spaces: ` SUPABASE_JWT_SECRET `
   - **Fix:** Remove all spaces, use exactly `SUPABASE_JWT_SECRET`

3. **Wrong Variable Type**
   - Variable is set as a build argument instead of environment variable
   - **Fix:** Ensure it's set as an **Environment Variable** (runtime), not a build argument

4. **Empty Value**
   - Variable exists but value is empty
   - **Fix:** Set the value from Supabase dashboard

## 🎯 Expected Result

After the fix, your deployment should:
- ✅ Start successfully
- ✅ Pass environment validation
- ✅ Allow Supabase authentication to work
- ✅ Show no errors about missing `SUPABASE_JWT_SECRET`

## 📞 Need Help?

If the issue persists after renaming:
1. Check the improved logs - they will now show the exact variable name and length
2. Compare the variable name character-by-character
3. Ensure there are no hidden characters
4. Verify the value is not empty

The updated validation code will provide more detailed diagnostics on the next deployment.

