-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Drop policies on users table if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own profile') THEN
    DROP POLICY "Users can view their own profile" ON public.users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update their own profile') THEN
    DROP POLICY "Users can update their own profile" ON public.users;
  END IF;
  
  -- Drop policies on family_groups table if they exist
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_groups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_groups' AND policyname = 'Family members can view their family') THEN
      DROP POLICY "Family members can view their family" ON public.family_groups;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_groups' AND policyname = 'Family head can manage family') THEN
      DROP POLICY "Family head can manage family" ON public.family_groups;
    END IF;
  END IF;
END
$$;

-- Create user_role type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'family_head', 'family_member', 'donor');
  END IF;
END
$$;

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role public.user_role DEFAULT 'donor'::public.user_role;
  END IF;
  
  -- Add family_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'family_id') THEN
    ALTER TABLE public.users ADD COLUMN family_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;
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

-- Create family_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  family_head_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_family_head UNIQUE (family_head_id)
);

-- Add foreign key from users to family_groups if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_family_id_fkey'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_family_id_fkey 
    FOREIGN KEY (family_id) 
    REFERENCES public.family_groups(id) 
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Create index on family_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- Enable RLS on users and family_groups tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for family_groups table
CREATE POLICY "Family members can view their family"
  ON public.family_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.family_id = family_groups.id
    )
  );

CREATE POLICY "Family head can manage family"
  ON public.family_groups FOR ALL
  USING (family_head_id = auth.uid());

-- Create or replace function to get user role
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

-- Create or replace function to check if user is family head
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

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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
