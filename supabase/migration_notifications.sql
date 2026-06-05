-- ============================================================
-- MIGRATION: Add notifications settings & notifications table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Step 1: Add notification preference columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_budget_alerts BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_goal_milestones BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_weekly_summary BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notif_large_transactions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_monthly_report BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS large_transaction_threshold DECIMAL DEFAULT 500;

-- Step 2: Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'budget_alert', 'goal_milestone', 'large_transaction', 'system'
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Add Row-Level Security policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Enable Realtime for the notifications table
-- Run this to allow realtime client subscriptions to listen to inserts/updates
alter publication supabase_realtime add table public.notifications;

