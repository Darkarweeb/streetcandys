/**
 * POST /api/email/resend-verification
 *
 * Resends the verification email for an unconfirmed account.
 * Generates a fresh Supabase verification link via the admin API and
 * sends it via Resend — the same template as the welcome email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminClient = createAdminClient();

    // Look up the user to get their full name and confirm they exist + are unverified
    const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error('[resend-verification] listUsers error:', listError.message);
      return NextResponse.json({ success: false, error: 'Error al buscar el usuario.' }, { status: 500 });
    }

    const authUser = usersPage?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    if (!authUser) {
      // Return success to avoid user enumeration
      return NextResponse.json({ success: true });
    }

    if (authUser.email_confirmed_at) {
      // Already verified — no need to resend
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Fetch full name from profiles table
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    const fullName = profile?.full_name || authUser.user_metadata?.full_name || 'Amigo';

    // Generate a fresh verification link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/email-verificado`,
      },
    });

    if (linkError) {
      console.error('[resend-verification] generateLink error:', linkError.message);
      return NextResponse.json(
        { success: false, error: 'No se pudo generar el enlace de verificación.' },
        { status: 500 },
      );
    }

    const verificationLink = linkData?.properties?.action_link ?? undefined;

    // Send via Resend
    const result = await sendWelcomeEmail({
      email: normalizedEmail,
      fullName,
      verificationLink,
    });

    if (!result.success) {
      console.warn('[resend-verification] Failed to send email:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[resend-verification] Unexpected error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
