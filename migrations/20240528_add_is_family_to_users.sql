-- Add is_family column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'is_family') THEN
        ALTER TABLE public.users
        ADD COLUMN is_family BOOLEAN DEFAULT FALSE;
        
        -- Add comment for the column
        COMMENT ON COLUMN public.users.is_family IS 'Indicates if the user is part of a family group';
        
        -- Update the RLS policy to include the new column
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
        
        -- Recreate the policies
        CREATE POLICY "Users can view their own profile"
          ON public.users FOR SELECT
          USING (auth.uid() = id);
          
        CREATE POLICY "Users can update their own profile"
          ON public.users FOR UPDATE
          USING (auth.uid() = id);
          
        RAISE NOTICE 'Added is_family column to users table';
    ELSE
        RAISE NOTICE 'is_family column already exists in users table';
    END IF;
END $$;
