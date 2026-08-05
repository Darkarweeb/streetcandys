/**
 * POST /api/admin/email-test — Admin-only endpoint to verify Resend email delivery
 * Sends a test welcome email to the specified address.
 * Requires admin or staff role. Never exposes API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';
import { FROM_EMAIL } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    // ── Payload ───────────────────────────────────────────────────────────────
    const body = await request.json();
    const { email, fullName } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el campo "email"' },
        { status: 400 },
      );
    }

    const recipientName = fullName || 'Admin Test';

    // ── Send test email ───────────────────────────────────────────────────────
    const result = await sendWelcomeEmail({ email, fullName: recipientName });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          from: FROM_EMAIL,
          hint:
            result.error?.includes('not configured') || result.error?.includes('API key')
              ? 'Set RESEND_API_KEY in your environment variables with a real Resend API key.' : result.error?.includes('domain')
                ? 'Verify the domain streetcandys.shop in your Resend dashboard under Domains.'
                : undefined,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      from: FROM_EMAIL,
      to: email,
      message: `Test welcome email sent successfully to ${email}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
