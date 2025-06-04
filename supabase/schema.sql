-- Schema for Donation Platform with Supabase Integration

-- IMPORTANT: This schema is designed to be applied to an existing Supabase project
-- It assumes auth.users table already exists (managed by Supabase Auth)

-- =============== TABLES ===============

-- Users table - stores user profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  pan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Donations table - stores donation information
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT DEFAULT 'yearly',
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  payment_url TEXT,
  donor_info JSONB NOT NULL,
  family_info JSONB,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- =============== INDEXES ===============

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS donations_user_id_idx ON public.donations(user_id);

-- Create index on payment_id for faster lookups
CREATE INDEX IF NOT EXISTS donations_payment_id_idx ON public.donations(payment_id);

-- =============== ROW LEVEL SECURITY ===============

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policy for users table - users can only see their own data
DROP POLICY IF EXISTS user_policy ON public.users;
CREATE POLICY user_policy ON public.users
  FOR ALL
  USING (auth.uid() = id);

-- Create policy for donations table - users can only see their own donations
DROP POLICY IF EXISTS donation_policy ON public.donations;
CREATE POLICY donation_policy ON public.donations
  FOR ALL
  USING (auth.uid() = user_id);

-- =============== FUNCTIONS & TRIGGERS ===============

-- Function to handle new user creation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user profile when metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', users.name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', users.phone),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_user_update();

-- Function to handle guest donations
CREATE OR REPLACE FUNCTION public.link_guest_donations()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.donations
  SET user_id = NEW.id
  WHERE donor_info->>'email' = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_created ON public.users;

-- Create trigger to link guest donations
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_donations();
