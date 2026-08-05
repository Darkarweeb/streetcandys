/**
 * POST /api/email/welcome
 *
 * Sends the welcome email after successful registration.
 * This endpoint:
 *  1. Uses the Supabase Admin API to generate a secure email verification link
 *     (does NOT send Supabase's own confirmation email — that is disabled in the dashboard).
 *  2. Embeds the verification link inside the Resend welcome email template.
 *  3. Sends a single unified email via Resend.
 *
 * Registration always succeeds even if this endpoint fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Missing email or fullName' },
        { status: 400 },
      );
    }

    // ── Generate a secure verification link via Supabase Admin API ──────────
    // generateLink creates the token server-side WITHOUT sending any email.
    // Supabase's own confirmation email must be disabled in the dashboard
    // (Auth → Email Templates → disable "Confirm signup" email).
    let verificationLink: string | undefined;
    try {
      const adminClient = createAdminClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'signup',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/email-verificado`,
        },
      });

      if (linkError) {
        console.warn('[welcome-email] Could not generate verification link:', linkError.message);
        // Non-fatal — send welcome email without verification link
      } else {
        verificationLink = linkData?.properties?.action_link ?? undefined;
      }
    } catch (linkErr) {
      console.warn('[welcome-email] generateLink threw:', linkErr);
      // Non-fatal
    }

    // ── Send welcome email via Resend ────────────────────────────────────────
    const result = await sendWelcomeEmail({ email, fullName, verificationLink });

    if (!result.success) {
      console.warn('[welcome-email] Failed to send welcome email to', email, result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 200 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[welcome-email] Unexpected error:', message);
    // Always return 200 — never block registration
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
