import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function POST(req: NextRequest) {
  try {
    let body: SpinRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
    }

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
    const { data: existingLead, error: checkError } = await adminClient
      .from('spin_leads')
      .select('id, coupon_code, prize_label, verification_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('spin_leads check error:', checkError);
      return NextResponse.json({ error: 'Error al verificar el correo' }, { status: 500 });
    }

    if (existingLead) {
      return NextResponse.json(
        {
          error: 'already_spun',
          message: 'Este correo ya participó en la ruleta.',
          existingPrize: existingLead.prize_label,
          existingCoupon: existingLead.coupon_code,
          verificationStatus: existingLead.verification_status,
        },
        { status: 409 }
      );
    }

    // ── Determine prize type mapped to DB enum ────────────────────────────────
    // spin_leads.prize_type is free text (not an enum), coupons.discount_type must be 'percentage' | 'fixed'
    const prizeType = discountType === 'shipping' ? 'free_shipping' : 'percentage';
    const safeValue = prizeValue ?? 0;

    // ── Generate coupon ───────────────────────────────────────────────────────
    const couponCode = generateCouponCode();
    const expiryDays = couponExpirationDays > 0 ? couponExpirationDays : 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    // coupons.discount_type CHECK: 'percentage' | 'fixed'
    // coupons.discount_value CHECK: > 0
    const couponDiscountType = discountType === 'shipping' ? 'fixed' : 'percentage';
    // For free shipping use a symbolic 1 unit value (discount_value must be > 0)
    const couponDiscountValue = discountType === 'shipping' ? 1 : Math.max(safeValue, 1);

    const { data: couponData, error: couponError } = await adminClient
      .from('coupons')
      .insert({
        code: couponCode,
        description: `Ruleta — ${prizeLabel} — ${normalizedEmail}`,
        discount_type: couponDiscountType,
        discount_value: couponDiscountValue,
        minimum_order_amount: minimumPurchase ?? 0,
        maximum_discount: null,
        usage_limit: 1,
        per_user_limit: 1,
        country_code: null,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (couponError) {
      console.error('coupons insert error:', couponError);
      return NextResponse.json({ error: 'Error al generar el cupón' }, { status: 500 });
    }

    // ── Insert spin lead record ───────────────────────────────────────────────
    const { error: leadError } = await adminClient.from('spin_leads').insert({
      email: normalizedEmail,
      first_name: nombre?.trim() || null,
      marketing_consent: consent,
      prize_label: prizeLabel,
      prize_type: prizeType,
      prize_value: safeValue,
      coupon_id: couponData.id,
      coupon_code: couponCode,
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      user_id: null,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
    });

    if (leadError) {
      // Unique constraint violation — race condition
      if (leadError.code === '23505') {
        return NextResponse.json(
          { error: 'already_spun', message: 'Este correo ya participó en la ruleta.' },
          { status: 409 }
        );
      }
      console.error('spin_leads insert error:', leadError);
      // Coupon was created but lead failed — still return success with coupon
      return NextResponse.json({
        status: 'success',
        prize: prizeLabel,
        couponCode,
        expiresAt,
      });
    }

    return NextResponse.json({
      status: 'success',
      prize: prizeLabel,
      couponCode,
      expiresAt,
    });
  } catch (err) {
    console.error('spin API unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
