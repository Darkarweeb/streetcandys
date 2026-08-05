/**
 * POST /api/email/welcome — Sends welcome email after successful registration
 * Called from the client after signUp() succeeds.
 * Registration always succeeds even if this endpoint fails.
 */

import { NextRequest, NextResponse } from 'next/server';
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

    const result = await sendWelcomeEmail({ email, fullName });

    if (!result.success) {
      // Log but return 200 — registration must not be affected
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
