-- ============================================================
-- Street Candy — Order Notifications Complete
-- Migration: 20260803500000_order_notifications_complete.sql
-- Adds: order_refunded notification type, notifications RLS policies
-- ============================================================

-- Add order_refunded notification type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'order_refunded'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'order_refunded';
  END IF;
END $$;

-- Ensure RLS is enabled on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for notifications (idempotent)
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "service_insert_notifications" ON public.notifications;
CREATE POLICY "service_insert_notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
ON public.notifications (profile_id, is_read, created_at DESC);
