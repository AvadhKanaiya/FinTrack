-- ============================================================
-- FIX: Profile RLS policies + backfill missing profile rows
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Step 1: Add the missing INSERT policy (safe — drops old one first)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 2: Recreate UPDATE policy with WITH CHECK clause
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Add missing columns (safe — idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_format   TEXT DEFAULT 'MMM_d_yyyy',
  ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'comma',
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP WITH TIME ZONE
                                         DEFAULT timezone('utc'::text, now());

-- Step 4: Backfill profile rows for any auth users that are missing one
-- (This runs with SECURITY DEFINER so it bypasses RLS)
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  au.id,
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);
