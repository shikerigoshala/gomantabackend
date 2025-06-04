-- Add a policy to allow service role to create user profiles
CREATE POLICY "Service role can create user profiles"
  ON public.users 
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add a policy to allow service role to update user profiles
CREATE POLICY "Service role can update user profiles"
  ON public.users 
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Add a policy to allow service role to view all user profiles
CREATE POLICY "Service role can view all user profiles"
  ON public.users 
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Grant necessary permissions to the service role
GRANT ALL ON public.users TO service_role;

-- Create a function to safely create a user profile
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, first_name, last_name, phone, is_family)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'is_family')::boolean, false)
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    is_family = EXCLUDED.is_family;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a user profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Grant execute permission on the function to the service role
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;
