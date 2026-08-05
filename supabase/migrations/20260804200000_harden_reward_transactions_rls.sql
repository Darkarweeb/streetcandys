-- ============================================================
-- Street Candy — Security Hardening: Reward Transactions RLS
-- Migration: 20260804200000_harden_reward_transactions_rls.sql
--
-- Issue: reward_transactions INSERT policy allowed any authenticated
-- user to insert rows directly from the browser (client-side).
-- The rewards service runs server-side using the Supabase service role
-- which bypasses RLS entirely, so authenticated users should NOT be
-- able to directly insert reward_transactions rows.
--
-- Fix: Remove the authenticated INSERT policy on reward_transactions.
-- Server-side operations use the service role (bypasses RLS).
-- Admins can still insert via the admin policy.
-- ============================================================

-- ── 1. Harden reward_transactions: remove direct client INSERT ────────────────
-- Drop the existing insert policy that allowed any authenticated user to insert
DROP POLICY IF EXISTS "reward_transactions_insert" ON public.reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_insert_service" ON public.reward_transactions;

-- Only admins can insert reward_transactions directly (server uses service role)
CREATE POLICY "reward_transactions_insert_admin_only"
ON public.reward_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ── 2. Harden rewards table: users cannot directly update their own balance ───
-- Drop existing update policy that allowed users to update their own rewards row
DROP POLICY IF EXISTS "rewards_update" ON public.rewards;
DROP POLICY IF EXISTS "rewards_update_service" ON public.rewards;

-- Only admins can update rewards directly (server uses service role)
CREATE POLICY "rewards_update_admin_only"
ON public.rewards
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ── 3. Ensure rewards INSERT is also admin-only (server uses service role) ────
DROP POLICY IF EXISTS "rewards_insert" ON public.rewards;
DROP POLICY IF EXISTS "rewards_insert_service" ON public.rewards;

CREATE POLICY "rewards_insert_admin_only"
ON public.rewards
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Note: The rewards service (rewards-service.ts) uses createClient() from
-- @/lib/supabase/server which uses the SUPABASE_SERVICE_ROLE_KEY when
-- available, bypassing RLS. These policies prevent browser-side manipulation.
