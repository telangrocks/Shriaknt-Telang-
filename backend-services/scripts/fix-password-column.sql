-- Fix: Make password column nullable for Supabase-authenticated users
-- This script removes the NOT NULL constraint from the password column
-- Supabase handles authentication externally, so we don't store passwords for Supabase users

-- Check if password column exists and has NOT NULL constraint
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'password'
    ) THEN
        -- Check if it's currently NOT NULL
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'password'
            AND is_nullable = 'NO'
        ) THEN
            -- Make it nullable
            ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
            RAISE NOTICE 'Password column is now nullable';
        ELSE
            RAISE NOTICE 'Password column is already nullable';
        END IF;
    ELSE
        RAISE NOTICE 'Password column does not exist (this is fine for new databases)';
    END IF;
END $$;

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'password';

