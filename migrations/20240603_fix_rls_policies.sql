-- Fix RLS policies for users table

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- 2. Create a function to check if current user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean AS $$
BEGIN
  RETURN auth.role() = 'authenticated' OR auth.role() = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to check if current user is service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN auth.role() = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create policies for users table
-- Allow service role full access
CREATE POLICY "Service role full access to users"
  ON public.users
  FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert for new users (this is crucial for signup)
CREATE POLICY "Allow insert for new users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
