-- ── Spin-to-Win OTP verification codes ───────────────────────────────────────
-- Stores short-lived 6-digit codes sent via Resend to verify email ownership
-- before creating a coupon. Codes expire after 10 minutes and are single-use.

CREATE TABLE IF NOT EXISTS public.spin_otp_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  code          TEXT        NOT NULL,
  verified      BOOLEAN     NOT NULL DEFAULT false,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_spin_otp_codes_email
  ON public.spin_otp_codes (email, expires_at);

-- Unique token per email per window (allow re-send by invalidating old ones)
-- No unique constraint needed — we always invalidate previous codes on send.

-- RLS: this table is only accessed server-side via service-role key.
-- Enable RLS but grant no public access (service-role bypasses RLS).
ALTER TABLE public.spin_otp_codes ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete expired codes older than 1 hour to keep table small.
-- This runs as a scheduled function or can be called manually.
CREATE OR REPLACE FUNCTION public.cleanup_spin_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.spin_otp_codes
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;
