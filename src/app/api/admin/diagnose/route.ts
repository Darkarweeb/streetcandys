import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const TARGET_EMAIL = 'streetcandysbackoffice@gmail.com';
const RESET_PASSWORD = 'StreetCandy2024!';

/** Decode the project ref from a Supabase URL */
function projectRefFromUrl(url: string): string {
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? 'unknown';
}

/** Decode the project ref embedded in a Supabase JWT (service role key) */
function projectRefFromJwt(jwt: string): string {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    // Supabase service role JWTs have `iss` = "supabase" and `ref` = project ref
    // OR the `iss` field contains the project ref URL
    if (payload.ref) return payload.ref as string;
    if (typeof payload.iss === 'string') {
      const m = payload.iss.match(/([a-z0-9]{20})/);
      if (m) return m[1];
    }
    return 'unknown';
  } catch {
    return 'parse-error';
  }
}

export async function GET() {
  const report: Record<string, unknown> = {
    email: TARGET_EMAIL,
    timestamp: new Date().toISOString(),
    env_checks: {},
    checks: {},
    fixes_applied: [] as string[],
    errors: [] as string[],
  };

  // ── STEP 0: Verify environment variables are present ────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const envChecks = report.env_checks as Record<string, unknown>;
  envChecks.NEXT_PUBLIC_SUPABASE_URL_present = supabaseUrl.length > 0;
  envChecks.NEXT_PUBLIC_SUPABASE_URL_value = supabaseUrl
    ? supabaseUrl.replace(/^(https:\/\/[^.]{4})[^.]+/, '$1***')
    : 'MISSING';
  envChecks.NEXT_PUBLIC_ANON_KEY_present = anonKey.length > 0;
  envChecks.SUPABASE_SERVICE_ROLE_KEY_present = serviceRoleKey.length > 0;
  envChecks.SUPABASE_SERVICE_ROLE_KEY_length = serviceRoleKey.length;
  envChecks.SUPABASE_SERVICE_ROLE_KEY_prefix = serviceRoleKey
    ? serviceRoleKey.substring(0, 20) + '...' :'MISSING';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        ...report,
        fatal: true,
        message:
          'One or more required environment variables are missing. ' +
          'Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file and redeploy.',
      },
      { status: 500 }
    );
  }

  // ── STEP 1: Verify service role key belongs to the same project ──────────
  const urlProjectRef = projectRefFromUrl(supabaseUrl);
  const jwtProjectRef = projectRefFromJwt(serviceRoleKey);

  envChecks.url_project_ref = urlProjectRef;
  envChecks.jwt_project_ref = jwtProjectRef;
  envChecks.project_refs_match =
    jwtProjectRef === 'unknown' || jwtProjectRef === 'parse-error' ?'could-not-verify'
      : urlProjectRef === jwtProjectRef;

  if (
    envChecks.project_refs_match === false
  ) {
    return NextResponse.json(
      {
        ...report,
        fatal: true,
        message:
          `MISMATCH: SUPABASE_SERVICE_ROLE_KEY belongs to project '${jwtProjectRef}' ` +
          `but NEXT_PUBLIC_SUPABASE_URL points to project '${urlProjectRef}'. ` + 'Copy the service_role key from the SAME Supabase project as your URL.',
      },
      { status: 500 }
    );
  }

  // ── STEP 2: Create admin client and verify it can call the Auth Admin API ─
  try {
    const adminClient = createAdminClient();

    // ── CHECK: List users (proves service role key works) ──────────────────
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      (report.errors as string[]).push(`listUsers failed: ${listError.message}`);
      return NextResponse.json(
        {
          ...report,
          fatal: true,
          message:
            `Admin API call failed: ${listError.message}. ` +
            'This usually means the SUPABASE_SERVICE_ROLE_KEY is wrong or expired. ' + 'Get a fresh key from Supabase Dashboard → Project Settings → API → service_role.',
        },
        { status: 500 }
      );
    }

    (report.checks as Record<string, unknown>).admin_api_accessible = true;
    (report.checks as Record<string, unknown>).total_users_in_project = listData.users.length;

    const authUser = listData.users.find(
      (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()
    );

    (report.checks as Record<string, unknown>).user_exists_in_auth = !!authUser;

    let userId: string;

    if (!authUser) {
      // ── CREATE user if missing ────────────────────────────────────────────
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: RESET_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Street Candy Admin', role: 'admin' },
      });

      if (createError) {
        (report.errors as string[]).push(`createUser failed: ${createError.message}`);
        return NextResponse.json({ ...report, fatal: true }, { status: 500 });
      }

      userId = newUser.user.id;
      (report.fixes_applied as string[]).push(
        `Created new auth user (id: ${userId}) with email confirmed and password set to '${RESET_PASSWORD}'`
      );
      (report.checks as Record<string, unknown>).user_id = userId;
      (report.checks as Record<string, unknown>).email_confirmed = true;
    } else {
      userId = authUser.id;
      (report.checks as Record<string, unknown>).user_id = userId;
      (report.checks as Record<string, unknown>).email_confirmed = !!authUser.email_confirmed_at;
      (report.checks as Record<string, unknown>).banned = !!authUser.banned_until;
      (report.checks as Record<string, unknown>).deleted = !!authUser.deleted_at;

      // ── FIX: Confirm email + reset password + unban ───────────────────────
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
        ban_duration: 'none',
        password: RESET_PASSWORD,
      });

      if (updateError) {
        (report.errors as string[]).push(`updateUser failed: ${updateError.message}`);
      } else {
        (report.fixes_applied as string[]).push(
          `Email confirmed, account unbanned, password reset to '${RESET_PASSWORD}'`
        );
        (report.checks as Record<string, unknown>).email_confirmed = true;
      }
    }

    // ── CHECK: Profile row ────────────────────────────────────────────────
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, role, is_active, full_name')
      .eq('id', userId)
      .single();

    (report.checks as Record<string, unknown>).profile_exists = !profileError && !!profile;

    if (profileError || !profile) {
      // Create missing profile
      const { error: insertError } = await adminClient.from('profiles').insert({
        id: userId,
        email: TARGET_EMAIL,
        full_name: 'Street Candy Admin',
        role: 'admin',
        age_verified: true,
        is_active: true,
      });

      if (insertError) {
        (report.errors as string[]).push(`profile insert failed: ${insertError.message}`);
      } else {
        (report.fixes_applied as string[]).push('Created missing profile row with role=admin');
        (report.checks as Record<string, unknown>).profile_role = 'admin';
        (report.checks as Record<string, unknown>).profile_is_active = true;
      }
    } else {
      (report.checks as Record<string, unknown>).profile_role = profile.role;
      (report.checks as Record<string, unknown>).profile_is_active = profile.is_active;

      if (profile.role !== 'admin' || !profile.is_active) {
        const { error: updateProfileError } = await adminClient
          .from('profiles')
          .update({ role: 'admin', is_active: true, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateProfileError) {
          (report.errors as string[]).push(`profile update failed: ${updateProfileError.message}`);
        } else {
          (report.fixes_applied as string[]).push(
            `Profile role updated from '${profile.role}' to 'admin', is_active set to true`
          );
          (report.checks as Record<string, unknown>).profile_role = 'admin';
          (report.checks as Record<string, unknown>).profile_is_active = true;
        }
      }
    }

    // ── FINAL STATE ──────────────────────────────────────────────────────────
    const { data: finalAuth } = await adminClient.auth.admin.getUserById(userId);
    const { data: finalProfile } = await adminClient
      .from('profiles')
      .select('role, is_active, email')
      .eq('id', userId)
      .single();

    const emailConfirmed = !!finalAuth?.user?.email_confirmed_at;
    const profileRole = finalProfile?.role ?? null;
    const profileActive = finalProfile?.is_active ?? false;
    const readyToLogin = emailConfirmed && profileRole === 'admin' && profileActive;

    report.final_state = {
      auth_user_exists: !!finalAuth?.user,
      email_confirmed: emailConfirmed,
      email_confirmed_at: finalAuth?.user?.email_confirmed_at ?? null,
      banned_until: finalAuth?.user?.banned_until ?? null,
      profile_exists: !!finalProfile,
      profile_role: profileRole,
      profile_is_active: profileActive,
      ready_to_login: readyToLogin,
    };

    const errors = report.errors as string[];
    const allGood = readyToLogin && errors.length === 0;

    return NextResponse.json({
      ...report,
      success: allGood,
      login_credentials: allGood
        ? {
            url: '/iniciar-sesion',
            email: TARGET_EMAIL,
            password: RESET_PASSWORD,
            note: 'Change this password after first login',
          }
        : null,
      message: allGood
        ? `✅ Super admin ${TARGET_EMAIL} is fully configured. Sign in at /iniciar-sesion with password '${RESET_PASSWORD}'.`
        : `⚠️ Some issues remain. Check 'errors' and 'final_state' for details.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY') || message.includes('Missing')) {
      return NextResponse.json(
        {
          ...report,
          fatal: true,
          message:
            'SUPABASE_SERVICE_ROLE_KEY is not configured or is empty. ' + 'Add it to your environment variables and redeploy. '+ 'Get it from: Supabase Dashboard → Project Settings → API → service_role key.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ...report, fatal: true, error: message }, { status: 500 });
  }
}
