import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpinRequest {
  email: string;
  nombre?: string;
  consent: boolean;
  prizeLabel: string;
  prizeValue: number | null;
  discountType: 'percentage' | 'shipping';
  couponExpirationDays: number;
  minimumPurchase: number;
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPIN-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── POST /api/spin/girar ──────────────────────────────────────────────────────
// Validates email uniqueness + email confirmation, records spin, creates coupon
// only when email is verified.

export async function POST(req: NextRequest) {
  try {
    const body: SpinRequest = await req.json();
    const { email, nombre, consent, prizeLabel, prizeValue, discountType, couponExpirationDays, minimumPurchase } = body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!email || !consent) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // ── Check if email already spun ───────────────────────────────────────────
    const { data: existingLead } = await adminClient
      .from('spin_leads')
      .select('id, coupon_code, prize, verification_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingLead) {
      return NextResponse.json(
        {
          error: 'already_spun',
          message: 'Este correo ya participó en la ruleta.',
          existingPrize: existingLead.prize,
          existingCoupon: existingLead.coupon_code,
          verificationStatus: existingLead.verification_status,
        },
        { status: 409 }
      );
    }

    // ── Check if authenticated user has confirmed email ───────────────────────
    const serverClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await serverClient.auth.getUser();

    let userId: string | null = null;
    let emailConfirmed = false;

    if (authUser) {
      // Authenticated user — check email_confirmed_at
      userId = authUser.id;
      emailConfirmed = authUser.email_confirmed_at != null;

      // Verify the email matches the authenticated user's email
      if (authUser.email?.toLowerCase() !== normalizedEmail) {
        // Different email from auth — treat as unverified anonymous spin
        userId = null;
        emailConfirmed = false;
      }
    } else {
      // Anonymous user — check if this email exists in auth and is confirmed
      // Using getUserByEmail for O(1) scalable lookup (no pagination limit)
      const { data: userData, error: userLookupError } = await adminClient.auth.admin.getUserByEmail(normalizedEmail);
      if (!userLookupError && userData?.user) {
        userId = userData.user.id;
        emailConfirmed = userData.user.email_confirmed_at != null;
      }
    }

    // ── Generate coupon code (always) ─────────────────────────────────────────
    const couponCode = generateCouponCode();
    const expiresAt = new Date(Date.now() + couponExpirationDays * 24 * 60 * 60 * 1000).toISOString();

    // ── Insert spin lead record ───────────────────────────────────────────────
    const verificationStatus = emailConfirmed ? 'verified' : 'pending';

    const { error: leadError } = await adminClient.from('spin_leads').insert({
      email: normalizedEmail,
      first_name: nombre?.trim() || null,
      marketing_consent: consent,
      prize_label: prizeLabel,
      coupon_code: emailConfirmed ? couponCode : null,
      user_id: userId,
      verification_status: verificationStatus,
      verified_at: emailConfirmed ? new Date().toISOString() : null,
    });

    if (leadError) {
      // Handle unique constraint violation (race condition)
      if (leadError.code === '23505') {
        return NextResponse.json(
          { error: 'already_spun', message: 'Este correo ya participó en la ruleta.' },
          { status: 409 }
        );
      }
      console.error('spin_leads insert error:', leadError);
      return NextResponse.json({ error: 'Error al registrar el giro' }, { status: 500 });
    }

    // ── If email is NOT confirmed: return pending state ───────────────────────
    if (!emailConfirmed) {
      return NextResponse.json({
        status: 'pending_verification',
        prize: prizeLabel,
        message: 'Confirma tu correo del Crew para activar tu descuento 🎁',
        email: normalizedEmail,
      });
    }

    // ── Email IS confirmed: create the coupon ─────────────────────────────────
    const couponPayload = {
      code: couponCode,
      description: `Ruleta de premios — ${prizeLabel} — ${normalizedEmail}`,
      discount_type: discountType === 'shipping' ? 'fixed' : 'percentage',
      discount_value: discountType === 'shipping' ? 0.01 : (prizeValue ?? 5),
      minimum_order_amount: minimumPurchase,
      maximum_discount: null,
      usage_limit: 1,
      per_user_limit: 1,
      country_code: 'CO',
      is_active: true,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    const { error: couponError } = await adminClient.from('coupons').insert(couponPayload);

    if (couponError) {
      console.error('coupons insert error:', couponError);
      return NextResponse.json({
        status: 'coupon_error',
        prize: prizeLabel,
        message: 'Tu premio fue registrado, pero hubo un error al generar el cupón. Contáctanos.',
      });
    }

    return NextResponse.json({
      status: 'success',
      prize: prizeLabel,
      couponCode,
      expiresAt,
    });
  } catch (err) {
    console.error('spin API error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
