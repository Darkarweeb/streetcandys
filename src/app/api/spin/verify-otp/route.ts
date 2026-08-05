import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── POST /api/spin/verify-otp ─────────────────────────────────────────────────
// Verifies the OTP code entered by the user. On success, marks it as verified
// so the /api/spin/girar endpoint can trust the email is real.
export async function POST(req: NextRequest) {
  try {
    let body: { email: string; code: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
    }

    const { email, code } = body;
    if (!email || !code) {
      return NextResponse.json({ error: 'Correo y código requeridos' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const adminClient = createAdminClient();

    // ── Look up the most recent valid (non-expired, non-verified) OTP ─────────
    const { data: otpRecord, error: lookupError } = await adminClient
      .from('spin_otp_codes')
      .select('id, code, expires_at, verified')
      .eq('email', normalizedEmail)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error('spin_otp_codes lookup error:', lookupError);
      return NextResponse.json({ error: 'Error al verificar el código' }, { status: 500 });
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'expired', message: 'El código ha expirado o ya fue usado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // ── Constant-time comparison to prevent timing attacks ────────────────────
    if (otpRecord.code !== normalizedCode) {
      return NextResponse.json(
        { error: 'invalid_code', message: 'Código incorrecto. Verifica e intenta de nuevo.' },
        { status: 400 }
      );
    }

    // ── Mark OTP as verified ──────────────────────────────────────────────────
    const { error: updateError } = await adminClient
      .from('spin_otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('spin_otp_codes update error:', updateError);
      return NextResponse.json({ error: 'Error al confirmar el código' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Correo verificado correctamente.' });
  } catch (err) {
    console.error('verify-otp unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
