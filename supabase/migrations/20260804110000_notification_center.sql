-- ============================================================
-- Street Candy — Notification Center
-- Migration: 20260804110000_notification_center.sql
-- Extends: notifications table with new types, action_url,
--          deleted_at (soft delete), admin announcement RPC
-- ============================================================

-- ============================================================
-- STEP 1: Add new notification type values (idempotent)
-- ============================================================

DO $$
BEGIN
  -- welcome
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'welcome'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'welcome';
  END IF;
END $$;

DO $$
BEGIN
  -- order_received
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'order_received'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'order_received';
  END IF;
END $$;

DO $$
BEGIN
  -- order_preparing (already may exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'order_preparing'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'order_preparing';
  END IF;
END $$;

DO $$
BEGIN
  -- promotion_available
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'promotion_available'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'promotion_available';
  END IF;
END $$;

DO $$
BEGIN
  -- loyalty_tier_upgraded
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'loyalty_tier_upgraded'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'loyalty_tier_upgraded';
  END IF;
END $$;

DO $$
BEGIN
  -- review_approved
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'review_approved'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'review_approved';
  END IF;
END $$;

DO $$
BEGIN
  -- system_announcement
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'system_announcement'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'system_announcement';
  END IF;
END $$;

DO $$
BEGIN
  -- reward_tier_up (may already exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'reward_tier_up'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'reward_tier_up';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Add columns to notifications table
-- ============================================================

-- action_url: optional deep link for the notification
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

-- deleted_at: soft delete support
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- STEP 3: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at
  ON public.notifications (profile_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications (profile_id, notification_type, created_at DESC);

-- ============================================================
-- STEP 4: RLS — add DELETE policy for soft-delete via UPDATE
-- (customers can soft-delete their own notifications)
-- ============================================================

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- ============================================================
-- STEP 5: Admin announcement function
-- Sends a notification to all customers or a specific group
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_admin_announcement(
  p_title        TEXT,
  p_body         TEXT,
  p_action_url   TEXT DEFAULT NULL,
  p_target       TEXT DEFAULT 'all',   -- 'all' | 'co' | 'cr'
  p_data         JSONB DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_caller_role TEXT;
BEGIN
  -- Verify caller is admin or staff
  SELECT role::TEXT INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_caller_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied: only admins can send announcements';
  END IF;

  -- Insert notification for each matching profile
  WITH target_profiles AS (
    SELECT id FROM public.profiles
    WHERE
      CASE
        WHEN p_target = 'all' THEN TRUE
        WHEN p_target = 'co'  THEN country_code = 'CO'
        WHEN p_target = 'cr'  THEN country_code = 'CR'
        ELSE TRUE
      END
      AND role = 'customer'
  )
  INSERT INTO public.notifications (
    profile_id,
    notification_type,
    title,
    body,
    action_url,
    data,
    is_read,
    created_at
  )
  SELECT
    tp.id,
    'system_announcement'::public.notification_type,
    p_title,
    p_body,
    p_action_url,
    p_data,
    FALSE,
    NOW()
  FROM target_profiles tp;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- ============================================================
-- STEP 6: Helper function to get notification counts by type
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_notification_summary(p_profile_id UUID)
RETURNS TABLE(
  notification_type TEXT,
  total_count       BIGINT,
  unread_count      BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    n.notification_type::TEXT,
    COUNT(*)                                    AS total_count,
    COUNT(*) FILTER (WHERE NOT n.is_read)       AS unread_count
  FROM public.notifications n
  WHERE n.profile_id = p_profile_id
    AND n.deleted_at IS NULL
  GROUP BY n.notification_type;
$$;
