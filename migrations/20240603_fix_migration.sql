-- First, drop any existing policies that might cause conflicts
DO $$
BEGIN
  -- Drop service role policy if it exists
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

-- Create the service role policy
CREATE POLICY "Service role has full access"
ON public.users
USING (auth.role() = 'service_role');
  
-- Create the family heads management policy
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

-- Add any additional policies or functions below
