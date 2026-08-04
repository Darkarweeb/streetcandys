-- Confirm email and activate account for the super admin user streetcandysbackoffice@gmail.com
-- This ensures the account is fully active and can sign in immediately

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by the correct email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('streetcandysbackoffice@gmail.com')
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Confirm the email, clear all pending tokens, and ensure account is active
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      confirmation_sent_at = NULL,
      recovery_token      = '',
      email_change_token_new = '',
      email_change_token_current = '',
      banned_until        = NULL,
      deleted_at          = NULL,
      updated_at          = now()
    WHERE id = target_user_id;

    RAISE NOTICE 'Super admin account activated for user id: %', target_user_id;
  ELSE
    RAISE NOTICE 'User streetcandysbackoffice@gmail.com not found — will be confirmed on first setup call';
  END IF;
END $$;

-- Also handle the case where the user may have been created with the old email variant
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('streetcandysbackend@gmail.com')
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      email_confirmed_at   = COALESCE(email_confirmed_at, now()),
      confirmation_token   = '',
      confirmation_sent_at = NULL,
      recovery_token       = '',
      banned_until         = NULL,
      deleted_at           = NULL,
      updated_at           = now()
    WHERE id = target_user_id;

    RAISE NOTICE 'Also activated legacy email variant streetcandysbackend@gmail.com';
  END IF;
END $$;
