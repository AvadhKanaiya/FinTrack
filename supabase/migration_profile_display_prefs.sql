-- Add display preference columns to profiles
-- Run this migration in Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MMM_d_yyyy',
  ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'comma',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Also add INSERT policy since handle_new_user trigger needs it
-- (Only needed if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;
