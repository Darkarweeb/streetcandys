/**
 * POST /api/auth/signup
 *
 * Server-side signup using the Supabase Admin API.
 *
 * Why this exists:
 *   supabase.auth.signUp() (client-side) triggers Supabase's built-in email
 *   delivery. When that delivery fails (e.g. custom SMTP / Resend misconfigured
 *   at the Supabase level) the entire signup is aborted with HTTP 500
 *   "Error sending confirmation email".
 *
 * This route bypasses that by:
 *   1. Creating the user via adminClient.auth.admin.createUser()
 *      with email_confirm: false  →  Supabase never attempts email delivery.
 *   2. Generating a secure confirmation link via generateLink({ type: 'signup' }).
 *   3. Sending the welcome + confirmation link email via Resend.
 *
 * Admin login is NOT affected — it uses signInWithPassword, not signUp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, countryCode } = await request.json();

    if (!email || !password || !fullName || !countryCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    // ── Step 1: Create the user without triggering Supabase email delivery ──
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // ← key: Supabase will NOT send its own confirmation email
      user_metadata: {
        full_name: fullName,
        country_code: countryCode,
        role: 'customer',
      },
    });

    if (createError) {
      // Surface meaningful errors to the client
      const msg = createError.message || 'Error al crear la cuenta.';
      const status =
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('duplicate')
          ? 409
          : 422;
      return NextResponse.json({ success: false, error: msg }, { status });
    }

    const userId = createData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User created but no ID returned.' },
        { status: 500 },
      );
    }

    // ── Step 2: Generate a secure email confirmation link ───────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
    let verificationLink: string | undefined;

    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'signup',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/email-verificado`,
        },
      });

      if (linkError) {
        console.warn('[signup-route] generateLink error (non-fatal):', linkError.message);
      } else {
        verificationLink = linkData?.properties?.action_link ?? undefined;
      }
    } catch (linkErr) {
      console.warn('[signup-route] generateLink threw (non-fatal):', linkErr);
    }

    // ── Step 3: Send welcome + verification email via Resend ─────────────────
    const emailResult = await sendWelcomeEmail({ email, fullName, verificationLink });

    if (!emailResult.success) {
      console.warn('[signup-route] Welcome email failed (non-fatal):', emailResult.error);
      // User was created — don't fail the signup because of email delivery
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[signup-route] Unexpected error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
