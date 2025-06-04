-- Step 1: Drop all existing policies
DO $$
DECLARE
  policy_record RECORD;
  policy_name TEXT;
BEGIN
  -- Drop all policies on users table
  FOR policy_record IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') 
  LOOP
    policy_name := policy_record.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
  END LOOP;
  
  -- Drop all policies on family_groups table if it exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_groups') THEN
    FOR policy_record IN (SELECT policyname FROM pg_policies WHERE tablename = 'family_groups')
    LOOP
      policy_name := policy_record.policyname;
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.family_groups', policy_name);
    END LOOP;
  END IF;
  
  -- Drop the is_service_role function if it exists
  DROP FUNCTION IF EXISTS public.is_service_role();
  
  -- Disable RLS temporarily to prevent any policy-related issues
  ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.family_groups DISABLE ROW LEVEL SECURITY;
END
$$;

-- Step 2: Create user_role type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'family_head', 'family_member', 'donor');
  END IF;
END
$$;

-- Step 3: Add missing columns to users table
DO $$
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role public.user_role DEFAULT 'donor'::public.user_role;
  END IF;
  
  -- Add family_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'family_id') THEN
    ALTER TABLE public.users ADD COLUMN family_id UUID;
  END IF;
  
  -- Add is_family column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_family') THEN
    ALTER TABLE public.users ADD COLUMN is_family BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add created_at and updated_at if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END
$$;

-- Step 4: First, ensure the users table has all necessary columns
DO $$
BEGIN
  -- Add is_family column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'is_family') THEN
    ALTER TABLE public.users ADD COLUMN is_family BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'donor';
  END IF;
  
  -- Add family_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'family_id') THEN
    ALTER TABLE public.users ADD COLUMN family_id UUID;
  END IF;
END
$$;

-- Create user_role type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'family_head', 'family_member', 'donor');
    
    -- Update the role column to use the new type
    ALTER TABLE public.users 
    ALTER COLUMN role TYPE public.user_role 
    USING role::public.user_role;
  END IF;
END
$$;

-- Step 5: Create family_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Add family_head_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'family_groups' 
                AND column_name = 'family_head_id') THEN
    ALTER TABLE public.family_groups 
    ADD COLUMN family_head_id UUID NOT NULL;
  END IF;
END
$$;

-- Step 7: Add unique constraint to family_groups
DO $$
BEGIN
  -- First check if the column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'family_groups' 
            AND column_name = 'family_head_id') THEN
    
    -- Then check if the constraint doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'unique_family_head'
    ) THEN
      BEGIN
        ALTER TABLE public.family_groups 
        ADD CONSTRAINT unique_family_head 
        UNIQUE (family_head_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint unique_family_head: %', SQLERRM;
      END;
    END IF;
  END IF;
END
$$;

-- Step 7: Add foreign key from family_groups to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'family_groups_family_head_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.family_groups 
      ADD CONSTRAINT family_groups_family_head_id_fkey
      FOREIGN KEY (family_head_id) 
      REFERENCES public.users(id) 
      ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key family_groups_family_head_id_fkey: %', SQLERRM;
    END;
  END IF;
END
$$;

-- Step 8: Add foreign key from users to family_groups if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_family_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.users 
      ADD CONSTRAINT users_family_id_fkey 
      FOREIGN KEY (family_id) 
      REFERENCES public.family_groups(id) 
      ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key users_family_id_fkey: %', SQLERRM;
    END;
  END IF;
END
$$;

-- Step 6: Create index on family_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- Step 7: Enable RLS on users and family_groups tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Step 8: Disable RLS temporarily to prevent recursion issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups DISABLE ROW LEVEL SECURITY;

-- Create a function to check if current user is a service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create minimal policies for users table
-- Allow service role full access (bypasses RLS)
CREATE POLICY "Service role full access to users"
  ON public.users
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 10: Create minimal policies for family_groups table
-- Allow service role full access (bypasses RLS)
CREATE POLICY "Service role full access to family_groups"
  ON public.family_groups
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Allow family members to view their family group (simplified)
CREATE POLICY "Family members can view their family"
  ON public.family_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.family_id = family_groups.id
  ));

-- Allow family head to manage their family group
CREATE POLICY "Family head can manage family"
  ON public.family_groups FOR ALL
  USING (family_head_id = auth.uid())
  WITH CHECK (family_head_id = auth.uid());

-- Re-enable RLS now that we have proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create a more reliable function to check for service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean AS $$
BEGIN
  -- First check JWT claims if available
  BEGIN
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If JWT claims not available, check the current role
    IF current_user = 'service_role' OR current_user = 'postgres' OR current_user = 'supabase_admin' THEN
      RETURN true;
    END IF;
  END;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create or replace function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'donor'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create or replace function to check if user is family head
CREATE OR REPLACE FUNCTION public.is_family_head()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.family_groups 
    WHERE family_head_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create triggers for updated_at
DO $$
BEGIN
  -- For users table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at') THEN
    CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  -- For family_groups table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_family_groups_updated_at') THEN
    CREATE TRIGGER set_family_groups_updated_at
    BEFORE UPDATE ON public.family_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Step 14: Output success message
SELECT 'Database schema updated successfully' AS message;
