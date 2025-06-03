-- Create user_roles enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('default', 'family_head', 'family_member');
  END IF;
END $$;

-- Create family_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_role and family_id columns to users table if they don't exist
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

-- Create indexes for better query performance if they don't exist
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
-- Enable RLS on users table if not already enabled
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

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  -- Drop update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON public.users;
  END IF;
  
  -- Drop other existing policies that might conflict
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Family members can view family profiles'
  ) THEN
    DROP POLICY "Family members can view family profiles" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Service role has full access'
  ) THEN
    DROP POLICY "Service role has full access" ON public.users;
  END IF;
END $$;

-- Create RLS policies for users table
DO $$
BEGIN
  -- Users can view their own profile
  CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
  
  -- Users can update their own profile
  CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
  
  -- Family members can view family profiles
  CREATE POLICY "Family members can view family profiles"
  ON public.users
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.users WHERE id = auth.uid()
    )
  );
  
-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop service role policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Service role has full access'
  ) THEN
    DROP POLICY "Service role has full access" ON public.users;
  END IF;

  -- Drop family heads policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Family heads can manage family members'
  ) THEN
    DROP POLICY "Family heads can manage family members" ON public.users;
  END IF;
END $$;

  -- Service role has full access (for admin operations)
  CREATE POLICY "Service role has full access"
  ON public.users
  USING (auth.role() = 'service_role');
  
  -- Family heads can manage family members
  CREATE POLICY "Family heads can manage family members"
  ON public.users
  FOR ALL
  USING (
    id IN (
      SELECT u.id 
      FROM public.users u
      JOIN public.users family_head ON u.family_id = family_head.family_id
      WHERE family_head.id = auth.uid() AND family_head.role = 'family_head'
    )
  )
  WITH CHECK (
    id IN (
      SELECT u.id 
      FROM public.users u
      JOIN public.users family_head ON u.family_id = family_head.family_id
      WHERE family_head.id = auth.uid() AND family_head.role = 'family_head'
    )
  );
END $$;

-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a family member being invited, set up their family relationship
  IF NEW.raw_user_meta_data->>'invited_by' IS NOT NULL THEN
    NEW.family_head_id = (NEW.raw_user_meta_data->>'invited_by')::UUID;
    
    -- Get the family_id from the inviting user
    SELECT family_id INTO NEW.family_id 
    FROM public.users 
    WHERE id = NEW.family_head_id;
    
    -- Set role to family_member for invited users
    NEW.role = 'family_member';
  END IF;
  
  -- Set default values
  NEW.is_active = COALESCE(NEW.is_active, TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Update the create_user_profile function to handle new fields
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value public.user_role;
  family_id_value UUID;
  family_head_id_value UUID;
  invited_by UUID;
BEGIN
  -- Determine the user's role
  user_role_value := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::public.user_role,
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'default'::public.user_role
  );
  
  -- Check if this is an invited family member
  invited_by := NULL;
  IF NEW.raw_user_meta_data->>'invited_by' IS NOT NULL THEN
    invited_by := (NEW.raw_user_meta_data->>'invited_by')::UUID;
    
    -- Get family details from the inviting user
    SELECT family_id, id INTO family_id_value, family_head_id_value
    FROM public.users 
    WHERE id = invited_by;
    
    -- If the inviting user is a family head, use their family_id
    IF family_head_id_value IS NOT NULL THEN
      -- Make sure the inviting user is a family head
      PERFORM 1 FROM public.users 
      WHERE id = invited_by AND role = 'family_head';
      
      IF FOUND THEN
        -- Set the new user as a family member
        user_role_value := 'family_member';
      ELSE
        -- If the inviting user is not a family head, don't set family relationships
        family_id_value := NULL;
        family_head_id_value := NULL;
      END IF;
    END IF;
  END IF;
  
  -- For family heads, create a new family group if one doesn't exist
  IF user_role_value = 'family_head' AND family_id_value IS NULL THEN
    INSERT INTO public.family_groups (
      name,
      created_by
    )
    VALUES (
      COALESCE(
        NEW.raw_user_meta_data->>'family_name',
        CONCAT(NEW.raw_user_meta_data->>'name', ''',s Family')
      ),
      NEW.id
    )
    RETURNING id INTO family_id_value;
  END IF;
  
  -- Get user details from metadata
  DECLARE
    user_name TEXT := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      CONCAT(
        NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
        CASE WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL 
             AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL 
             THEN ' ' ELSE '' END,
        NULLIF(NEW.raw_user_meta_data->>'last_name', '')
      ),
      NEW.email
    );
    first_name TEXT := COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      SPLIT_PART(user_name, ' ', 1)
    );
    last_name TEXT := COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      CASE 
        WHEN array_length(string_to_array(user_name, ' '), 1) > 1 
        THEN array_to_string((string_to_array(user_name, ' ', 2))[2:], ' ')
        ELSE ''
      END
    );
    phone TEXT := COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NEW.phone,
      ''
    );
  BEGIN
    -- Insert or update the user profile
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      first_name, 
      last_name, 
      phone, 
      role,
      family_id,
      family_head_id,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      first_name,
      last_name,
      phone,
      user_role_value,
      family_id_value,
      family_head_id_value,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      role = CASE 
        WHEN users.role = 'default' OR users.role IS NULL 
        THEN EXCLUDED.role 
        ELSE users.role 
      END,
      family_id = COALESCE(users.family_id, EXCLUDED.family_id),
      family_head_id = COALESCE(users.family_head_id, EXCLUDED.family_head_id),
      is_active = COALESCE(EXCLUDED.is_active, users.is_active, TRUE),
      updated_at = NOW()
    WHERE 
      users.id = EXCLUDED.id;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on family_groups if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'family_groups' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies on family_groups to avoid conflicts
DO $$
BEGIN
  -- Drop view policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_groups' 
    AND policyname = 'Users can view their own family group'
  ) THEN
    DROP POLICY "Users can view their own family group" ON public.family_groups;
  END IF;
  
  -- Drop update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_groups' 
    AND policyname = 'Family heads can update their family group'
  ) THEN
    DROP POLICY "Family heads can update their family group" ON public.family_groups;
  END IF;
  
  -- Drop service role policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_groups' 
    AND policyname = 'Service role has full access to family_groups'
  ) THEN
    DROP POLICY "Service role has full access to family_groups" ON public.family_groups;
  END IF;
END $$;

-- Create or replace policies for family_groups
DO $$
BEGIN
  -- Allow authenticated users to view their own family group
  CREATE POLICY "Users can view their own family group"
  ON public.family_groups
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.users WHERE family_id = family_groups.id
  ));
  
  -- Allow family heads to update their family group
  CREATE POLICY "Family heads can update their family group"
  ON public.family_groups
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM public.users 
    WHERE family_id = family_groups.id AND role = 'family_head'
  ));
  
  -- Allow service role full access
  CREATE POLICY "Service role has full access to family_groups"
  ON public.family_groups
  USING (auth.role() = 'service_role');
END $$;

-- Drop and recreate users table policies
DO $$
BEGIN
  -- Drop existing policies on users table to avoid conflicts
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can view family members'
  ) THEN
    DROP POLICY "Users can view family members" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Family heads can update family members'
  ) THEN
    DROP POLICY "Family heads can update family members" ON public.users;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Service role has full access'
  ) THEN
    DROP POLICY "Service role has full access" ON public.users;
  END IF;
  
  -- Create users table policies
  -- Users can view their own profile
  EXECUTE 'CREATE POLICY "Users can view their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id)';
  
  -- Users can view other users in their family
  EXECUTE 'CREATE POLICY "Users can view family members"
    ON public.users
    FOR SELECT
    USING (
      family_id IS NOT NULL 
      AND family_id IN (
        SELECT family_id FROM public.users WHERE id = auth.uid()
      )
    )';
  
  -- Users can update their own profile
  EXECUTE 'CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)';
  
  -- Family heads can update family member profiles
  EXECUTE 'CREATE POLICY "Family heads can update family members"
    ON public.users
    FOR UPDATE
    USING (
      family_head_id = auth.uid() 
      AND role = ''family_member''::public.user_role
    )';
  
  -- Allow service role full access (for server-side operations)
  EXECUTE 'CREATE POLICY "Service role has full access"
    ON public.users
    USING (auth.role() = ''service_role'')';
END $$;

-- Drop and recreate family_groups service role policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_groups' 
    AND policyname = 'Service role has full access to family_groups'
  ) THEN
    DROP POLICY "Service role has full access to family_groups" ON public.family_groups;
  END IF;
  
  EXECUTE 'CREATE POLICY "Service role has full access to family_groups"
    ON public.family_groups
    USING (auth.role() = ''service_role'')';
END $$;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_family_head();
DROP FUNCTION IF EXISTS public.is_family_member();

-- Create function to get current user's role
CREATE FUNCTION public.get_user_role()
RETURNS public.user_role AS '
  SELECT role FROM public.users WHERE id = auth.uid();
' LANGUAGE SQL STABLE SECURITY DEFINER;

-- Create function to check if user is a family head
CREATE FUNCTION public.is_family_head()
RETURNS boolean AS '
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = ''family_head''::public.user_role
  )
' LANGUAGE SQL STABLE SECURITY DEFINER;

-- Create function to check if user is a family member
CREATE FUNCTION public.is_family_member()
RETURNS boolean AS '
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = ''family_member''::public.user_role
  )
' LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.family_groups TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_head() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member() TO authenticated;

-- Grant service role necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
