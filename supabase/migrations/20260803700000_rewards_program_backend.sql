-- ============================================================
-- Street Candy — Rewards Program Backend
-- Migration: 20260803700000_rewards_program_backend.sql
-- Adds:
--   1. Unique partial index to prevent duplicate point awards per order
--   2. Service-role (server-side) INSERT/UPDATE policies on rewards tables
-- ============================================================

-- ── 1. Prevent duplicate earned_purchase transactions for the same order ──
-- A partial unique index on (order_id) where transaction_type = 'earned_purchase'
-- ensures we never award points twice for the same order.
DROP INDEX IF EXISTS public.idx_reward_tx_unique_earned_purchase;
CREATE UNIQUE INDEX idx_reward_tx_unique_earned_purchase
  ON public.reward_transactions (order_id)
  WHERE transaction_type = 'earned_purchase';

-- ── 2. RLS policies: allow authenticated server calls to INSERT reward records ──
-- The rewards service runs server-side with the authenticated Supabase client
-- (service role bypasses RLS, but anon/authenticated server clients need policies).

-- Allow INSERT on reward_transactions for authenticated users (server-side service)
DROP POLICY IF EXISTS "reward_transactions_insert_service" ON public.reward_transactions;
CREATE POLICY "reward_transactions_insert_service"
ON public.reward_transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow INSERT on rewards (upsert new reward row when customer has none yet)
DROP POLICY IF EXISTS "rewards_insert_service" ON public.rewards;
CREATE POLICY "rewards_insert_service"
ON public.rewards
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow UPDATE on rewards for authenticated users (server-side balance update)
DROP POLICY IF EXISTS "rewards_update_service" ON public.rewards;
CREATE POLICY "rewards_update_service"
ON public.rewards
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
