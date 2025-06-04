-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_family BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.users IS 'Stores user profile information';
COMMENT ON COLUMN public.users.id IS 'References the auth.users table';
COMMENT ON COLUMN public.users.email IS 'User''s email address';
COMMENT ON COLUMN public.users.name IS 'User''s full name';
COMMENT ON COLUMN public.users.first_name IS 'User''s first name';
COMMENT ON COLUMN public.users.last_name IS 'User''s last name';
COMMENT ON COLUMN public.users.phone IS 'User''s phone number';
COMMENT ON COLUMN public.users.is_family IS 'Indicates if the user is part of a family group';

-- Create an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
