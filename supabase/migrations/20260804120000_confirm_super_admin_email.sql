-- Confirm email for the super admin user so they can sign in immediately
-- This sets email_confirmed_at and clears any pending confirmation tokens

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'streetcandysbackend@gmail.com'
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Confirm the email and clear confirmation tokens
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = '',
      confirmation_sent_at = NULL,
      updated_at = now()
    WHERE id = target_user_id;

    RAISE NOTICE 'Super admin email confirmed for user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User streetcandysbackend@gmail.com not found in auth.users';
  END IF;
END $$;
