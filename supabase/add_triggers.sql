-- Add triggers after running the safe schema
-- Run this script after successfully running safe_schema.sql

-- First, check if the triggers already exist and drop them if they do
DO $$
BEGIN
    -- Drop auth.users trigger if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    END IF;
    
    -- Drop auth.users update trigger if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_updated') THEN
        DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
    END IF;
    
    -- Drop users trigger if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created') THEN
        DROP TRIGGER IF EXISTS on_user_created ON public.users;
    END IF;
END
$$;

-- Now create the triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_user_update();

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_donations();

-- Add policies after running the safe schema
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS user_policy ON public.users;
    DROP POLICY IF EXISTS donation_policy ON public.donations;
    
    -- Create policies
    CREATE POLICY user_policy ON public.users
      FOR ALL
      USING (auth.uid() = id);
    
    CREATE POLICY donation_policy ON public.donations
      FOR ALL
      USING (auth.uid() = user_id);
END
$$;
