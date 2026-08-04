import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// One-time use flag — resets on server restart, but that's acceptable for a recovery endpoint.
// Once called successfully, this module-level variable prevents re-use within the same process.
let used = false;

export async function GET() {
  if (used) {
    return NextResponse.json(
      { error: 'This recovery endpoint has already been used and is now disabled.' },
      { status: 410 }
    );
  }

  const targetEmail = 'streetcandysbackoffice@gmail.com';

  try {
    const adminClient = createAdminClient();

    // 1. Find the user by email
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: `Failed to list users: ${listError.message}` }, { status: 500 });
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: `User ${targetEmail} not found in Supabase Auth.` },
        { status: 404 }
      );
    }

    // 2. Force-confirm the email using the admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      ban_duration: 'none',
    });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to confirm email: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 3. Send a password reset email so the admin can set a new known password
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/nueva-contrasena`,
    });

    if (resetError) {
      return NextResponse.json(
        { error: `Email confirmed but password reset failed: ${resetError.message}` },
        { status: 500 }
      );
    }

    // 4. Mark endpoint as used — self-disable
    used = true;

    return NextResponse.json({
      success: true,
      message: `Email confirmed and password reset email sent to ${targetEmail}. Check your inbox and click the link to set a new password. This endpoint is now disabled.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
