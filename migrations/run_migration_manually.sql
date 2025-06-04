-- Run these SQL statements in your Supabase SQL editor
-- Copy and paste the contents of this file into the SQL editor at: https://app.supabase.com/project/YOUR_PROJECT_REF/sql
-- Replace YOUR_PROJECT_REF with your actual project reference

-- 1. Create the user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('default', 'family_head', 'family_member');
  END IF;
END $$;

-- 2. Create family_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add columns to users table if they don't exist
DO $$
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role public.user_role NOT NULL DEFAULT 'default';
  END IF;
  
  -- Add family_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'family_id') THEN
    ALTER TABLE public.users ADD COLUMN family_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;
  END IF;
  
  -- Add family_head_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'family_head_id') THEN
    ALTER TABLE public.users ADD COLUMN family_head_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'is_active') THEN
    ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'name') THEN
    ALTER TABLE public.users ADD COLUMN name TEXT;
  END IF;
  
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'first_name') THEN
    ALTER TABLE public.users ADD COLUMN first_name TEXT;
  END IF;
  
  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'last_name') THEN
    ALTER TABLE public.users ADD COLUMN last_name TEXT;
  END IF;
  
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;
  
  -- Add is_family column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'is_family') THEN
    ALTER TABLE public.users ADD COLUMN is_family BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 4. Create indexes for better query performance
DO $$
BEGIN
  -- Check if index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND indexname = 'idx_users_role'
  ) THEN
    CREATE INDEX idx_users_role ON public.users(role);
  END IF;
  
  -- Add index for family_head_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND indexname = 'idx_users_family_head_id'
  ) THEN
    CREATE INDEX idx_users_family_head_id ON public.users(family_head_id);
  END IF;
  
  -- Add index for family_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND indexname = 'idx_users_family_id'
  ) THEN
    CREATE INDEX idx_users_family_id ON public.users(family_id);
  END IF;
END $$;

-- 5. Enable RLS on users table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6. Create policies for users table
-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  -- Drop select policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Enable read access for users based on id'
  ) THEN
    DROP POLICY "Enable read access for users based on id" ON public.users;
  END IF;
  
  -- Drop update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Enable update for users based on id'
  ) THEN
    DROP POLICY "Enable update for users based on id" ON public.users;
  END IF;
  
  -- Drop delete policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Enable delete for users based on id'
  ) THEN
    DROP POLICY "Enable delete for users based on id" ON public.users;
  END IF;
END $$;

-- 7. Create new policies
-- Allow users to read their own profile
CREATE POLICY "Enable read access for users based on id"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Enable update for users based on id"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Enable delete for users based on id"
ON public.users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 8. Create a function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role_value, 'default'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create a function to check if the current user is a family head
CREATE OR REPLACE FUNCTION public.is_family_head()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'family_head'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create a function to check if the current user is a family member
CREATE OR REPLACE FUNCTION public.is_family_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'family_member'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
