-- =============================================================
-- MIGRATION: System-Wide Default Categories
-- Run this in your Supabase Dashboard → SQL Editor
-- =============================================================

-- STEP 1: Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own categories" ON categories;

-- STEP 2: New policy — users can see system categories (user_id IS NULL) OR their own
CREATE POLICY "Users can view categories"
  ON categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- NOTE: The existing UPDATE/DELETE policies already prevent modifying system categories
-- because they check (auth.uid() = user_id) and system rows have user_id = NULL.

-- STEP 3: Seed default system categories (user_id = NULL = system-wide)
INSERT INTO categories (id, user_id, name, icon, color, type) VALUES
  -- ── Expense Categories ──────────────────────────────────────
  (uuid_generate_v4(), NULL, 'Food & Dining',    '🍔', '#f97316', 'expense'),
  (uuid_generate_v4(), NULL, 'Transportation',   '🚗', '#3b82f6', 'expense'),
  (uuid_generate_v4(), NULL, 'Shopping',         '🛍️', '#ec4899', 'expense'),
  (uuid_generate_v4(), NULL, 'Entertainment',    '🎬', '#a855f7', 'expense'),
  (uuid_generate_v4(), NULL, 'Utilities',        '💡', '#eab308', 'expense'),
  (uuid_generate_v4(), NULL, 'Healthcare',       '🏥', '#ef4444', 'expense'),
  (uuid_generate_v4(), NULL, 'Education',        '📚', '#6366f1', 'expense'),
  (uuid_generate_v4(), NULL, 'Housing & Rent',   '🏠', '#14b8a6', 'expense'),
  (uuid_generate_v4(), NULL, 'Travel',           '✈️', '#06b6d4', 'expense'),
  (uuid_generate_v4(), NULL, 'Subscriptions',    '📱', '#8b5cf6', 'expense'),
  (uuid_generate_v4(), NULL, 'Groceries',        '🛒', '#84cc16', 'expense'),
  (uuid_generate_v4(), NULL, 'Personal Care',    '💅', '#f43f5e', 'expense'),
  -- ── Income Categories ───────────────────────────────────────
  (uuid_generate_v4(), NULL, 'Salary',           '💼', '#22c55e', 'income'),
  (uuid_generate_v4(), NULL, 'Freelance',        '💻', '#10b981', 'income'),
  (uuid_generate_v4(), NULL, 'Investments',      '📈', '#4ade80', 'income'),
  (uuid_generate_v4(), NULL, 'Gift / Bonus',     '🎁', '#f59e0b', 'income'),
  (uuid_generate_v4(), NULL, 'Rental Income',    '🏡', '#2dd4bf', 'income'),
  (uuid_generate_v4(), NULL, 'Other Income',     '💰', '#38bdf8', 'income');
