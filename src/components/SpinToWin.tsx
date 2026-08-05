'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpinToWinSettings, DEFAULT_SPIN_SETTINGS, SpinPrize } from '@/hooks/useSpinToWinSettings';

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'sc_spin_to_win';

interface SpinState {
  dismissed: boolean;
  completed: boolean;
}

// ─── Wheel Segment colors (fixed, not configurable) ───────────────────────────
const SEGMENT_COLORS = [
  { color: '#163317', textColor: '#FFFCF8' },
  { color: '#4571CB', textColor: '#FFFCF8' },
  { color: '#1E5D1E', textColor: '#FFFCF8' },
  { color: '#163317', textColor: '#FFFCF8' },
  { color: '#4571CB', textColor: '#FFFCF8' },
  { color: '#EDE8E1', textColor: '#163317' },
  { color: '#1E5D1E', textColor: '#FFFCF8' },
  { color: '#4571CB', textColor: '#FFFCF8' },
];

function getTotalWeight(prizes: SpinPrize[]): number {
  return prizes.reduce((s, p) => s + p.weight, 0);
}

function pickWeightedIndex(prizes: SpinPrize[]): number {
  const total = getTotalWeight(prizes);
  let rand = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    rand -= prizes[i].weight;
    if (rand <= 0) return i;
  }
  return prizes.length - 1;
}

// ─── SVG Wheel ────────────────────────────────────────────────────────────────
function WheelSVG({ rotation, prizes }: { rotation: number; prizes: SpinPrize[] }) {
  const cx = 150;
  const cy = 150;
  const r = 140;
  const SEG_COUNT = prizes.length;
  const SEG_ANGLE = 360 / SEG_COUNT;

  const segments = prizes.map((prize, i) => {
    const startAngle = i * SEG_ANGLE - 90;
    const endAngle = startAngle + SEG_ANGLE;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const midAngle = startAngle + SEG_ANGLE / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const textR = r * 0.65;
    const tx = cx + textR * Math.cos(midRad);
    const ty = cy + textR * Math.sin(midRad);

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
    const { color, textColor } = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

    return { prize, d, tx, ty, midAngle, color, textColor };
  });

  return (
    <svg
      viewBox="0 0 300 300"
      width="300"
      height="300"
      aria-hidden="true"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0s',
        display: 'block',
      }}
    >
      <circle cx={cx} cy={cy} r={r + 4} fill="#163317" />
      {segments.map(({ prize, d, tx, ty, midAngle, color, textColor }, i) => (
        <g key={i}>
          <path d={d} fill={color} stroke="#FFFCF8" strokeWidth="1.5" />
          <text
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={prize.label.length > 3 ? '9' : '13'}
            fontWeight="700"
            fontFamily="DM Sans, sans-serif"
            transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
          >
            {prize.label}
          </text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r={18} fill="#163317" stroke="#FFFCF8" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={8} fill="#4571CB" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SpinToWin() {
  const { settings, loading: settingsLoading } = useSpinToWinSettings();

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  // Added 'otp_verify' phase between 'form' and 'spinning'
  const [phase, setPhase] = useState<'form' | 'otp_verify' | 'spinning' | 'result'>('form');

  // Form state
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [consent, setConsent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Wheel state
  const [rotation, setRotation] = useState(0);
  const [winIndex, setWinIndex] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Stored form data to use after OTP verification
  const pendingFormRef = useRef<{
    email: string;
    nombre: string;
    consent: boolean;
    prizeLabel: string;
    prizeValue: number | null;
    discountType: 'percentage' | 'shipping';
    couponExpirationDays: number;
    minimumPurchase: number;
    idx: number;
  } | null>(null);

  const spinAnimRef = useRef<number | null>(null);
  const startRotRef = useRef(0);
  const targetRotRef = useRef(0);
  const startTimeRef = useRef(0);
  const SPIN_DURATION = 4000;

  // ── Mount + localStorage check ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || settingsLoading) return;
    if (!settings.enabled) return;

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const state: SpinState = JSON.parse(raw);
        if (state.dismissed || state.completed) return;
      }
    } catch {
      // ignore parse errors
    }

    const delayMs = (settings.delay_seconds ?? DEFAULT_SPIN_SETTINGS.delay_seconds) * 1000;
    const timer = setTimeout(() => setVisible(true), delayMs);

    let handleMouseLeave: ((e: MouseEvent) => void) | null = null;
    if (settings.exit_intent) {
      handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          clearTimeout(timer);
          setVisible(true);
          document.removeEventListener('mouseleave', handleMouseLeave!);
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearTimeout(timer);
      if (handleMouseLeave) document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mounted, settingsLoading, settings.enabled, settings.delay_seconds, settings.exit_intent]);

  // ── Resend OTP cooldown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Dismiss ─────────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ dismissed: true, completed: false }));
    } catch {}
  }, []);

  // ── Form validation ──────────────────────────────────────────────────────────
  const validateForm = () => {
    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError('Ingresa un correo electrónico válido');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!consent) {
      setConsentError('Debes aceptar para girar la ruleta');
      valid = false;
    } else {
      setConsentError('');
    }
    return valid;
  };

  // ── Spin animation ───────────────────────────────────────────────────────────
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

  const animateSpin = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const eased = easeOut(progress);
    const currentRot = startRotRef.current + eased * (targetRotRef.current - startRotRef.current);
    setRotation(currentRot);

    if (progress < 1) {
      spinAnimRef.current = requestAnimationFrame(animateSpin);
    } else {
      setRotation(targetRotRef.current);
      spinAnimRef.current = null;
    }
  }, []);

  // ── Step 1: Submit form → send OTP ───────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setOtpMessage('');

    const prizes = settings.prizes ?? DEFAULT_SPIN_SETTINGS.prizes;
    const idx = pickWeightedIndex(prizes);
    const seg = prizes[idx];
    const expirationDays = settings.coupon_expiration_days ?? DEFAULT_SPIN_SETTINGS.coupon_expiration_days;
    const minPurchase = settings.minimum_purchase ?? DEFAULT_SPIN_SETTINGS.minimum_purchase;

    // Store form data for use after OTP verification
    pendingFormRef.current = {
      email: email.trim().toLowerCase(),
      nombre: nombre.trim(),
      consent,
      prizeLabel: seg.label,
      prizeValue: seg.value,
      discountType: seg.discountType,
      couponExpirationDays: expirationDays,
      minimumPurchase: minPurchase,
      idx,
    };

    try {
      const res = await fetch('/api/spin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'already_spun') {
          setSaveError('Este correo ya participó en la ruleta. Solo se permite un giro por correo.');
          if (data.existingCoupon) setCouponCode(data.existingCoupon);
          setWinIndex(idx);
          setPhase('result');
        } else {
          setEmailError(data.error || 'No se pudo enviar el código. Intenta de nuevo.');
        }
        return;
      }

      // OTP sent — move to verification phase
      setOtpCode('');
      setOtpError('');
      setOtpMessage('');
      setResendCooldown(60);
      setPhase('otp_verify');
    } catch {
      setEmailError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP → spin wheel ──────────────────────────────────────────
  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Ingresa el código de 6 dígitos');
      return;
    }

    const pending = pendingFormRef.current;
    if (!pending) {
      setOtpError('Sesión expirada. Por favor recarga la página.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // Verify OTP
      const verifyRes = await fetch('/api/spin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pending.email, code: otpCode.trim() }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setOtpError(verifyData.message || 'Código incorrecto. Intenta de nuevo.');
        return;
      }

      // OTP verified — start spin animation
      setWinIndex(pending.idx);

      const prizes = settings.prizes ?? DEFAULT_SPIN_SETTINGS.prizes;
      const SEG_ANGLE = 360 / prizes.length;
      const segCenterAngle = pending.idx * SEG_ANGLE + SEG_ANGLE / 2;
      const extraSpins = 5 * 360;
      const alignAngle = (360 - segCenterAngle) % 360;
      const target = startRotRef.current + extraSpins + alignAngle;

      targetRotRef.current = target;
      startTimeRef.current = 0;
      startRotRef.current = rotation;

      setPhase('spinning');
      spinAnimRef.current = requestAnimationFrame(animateSpin);

      // Call girar API (now trusts OTP was verified)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let spinRes: Response;
      try {
        spinRes = await fetch('/api/spin/girar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            email: pending.email,
            nombre: pending.nombre || undefined,
            consent: pending.consent,
            prizeLabel: pending.prizeLabel,
            prizeValue: pending.prizeValue,
            discountType: pending.discountType,
            couponExpirationDays: pending.couponExpirationDays,
            minimumPurchase: pending.minimumPurchase,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const spinData = await spinRes.json();

      // Wait for animation to finish
      const waitForAnimation = () =>
        new Promise<void>((resolve) => {
          const deadline = Date.now() + SPIN_DURATION + 500;
          const check = () => {
            if (spinAnimRef.current === null || Date.now() >= deadline) {
              if (spinAnimRef.current !== null) {
                cancelAnimationFrame(spinAnimRef.current);
                spinAnimRef.current = null;
              }
              resolve();
            } else {
              setTimeout(check, 50);
            }
          };
          setTimeout(check, SPIN_DURATION);
        });

      await waitForAnimation();

      if (!spinRes.ok) {
        if (spinData.error === 'already_spun') {
          try { localStorage.setItem(LS_KEY, JSON.stringify({ dismissed: false, completed: true })); } catch {}
          setSaveError('Este correo ya participó en la ruleta. Solo se permite un giro por correo.');
          if (spinData.existingCoupon) setCouponCode(spinData.existingCoupon);
        } else {
          setSaveError(spinData.error || 'Error al procesar el giro. Intenta de nuevo.');
        }
        setPhase('result');
      } else if (spinData.status === 'success') {
        setCouponCode(spinData.couponCode);
        setPhase('result');
        try { localStorage.setItem(LS_KEY, JSON.stringify({ dismissed: false, completed: true })); } catch {}
      } else {
        setSaveError(spinData.message || 'Tu premio fue registrado, pero hubo un error al generar el cupón.');
        setPhase('result');
        try { localStorage.setItem(LS_KEY, JSON.stringify({ dismissed: false, completed: true })); } catch {}
      }
    } catch (err: unknown) {
      if (spinAnimRef.current !== null) {
        cancelAnimationFrame(spinAnimRef.current);
        spinAnimRef.current = null;
      }
      const isAbort = (err as Error).name === 'AbortError';
      setSaveError(
        isAbort
          ? 'La solicitud tardó demasiado. Por favor intenta de nuevo.'
          : 'Error de conexión. Por favor intenta de nuevo.'
      );
      setPhase('result');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || otpSending) return;
    const pending = pendingFormRef.current;
    if (!pending) return;

    setOtpSending(true);
    setOtpMessage('');
    setOtpError('');

    try {
      const res = await fetch('/api/spin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pending.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'rate_limited') {
          setResendCooldown(data.waitSeconds ?? 60);
          setOtpMessage(`Espera ${data.waitSeconds ?? 60} segundos antes de solicitar otro código.`);
        } else {
          setOtpMessage(data.error || 'No se pudo reenviar el código.');
        }
      } else {
        setOtpMessage('✅ Nuevo código enviado. Revisa tu bandeja de entrada.');
        setResendCooldown(60);
        setOtpCode('');
      }
    } catch {
      setOtpMessage('Error de conexión. Intenta de nuevo.');
    } finally {
      setOtpSending(false);
    }
  };

  // ── Cleanup animation on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (spinAnimRef.current) cancelAnimationFrame(spinAnimRef.current);
    };
  }, []);

  if (!mounted || !visible) return null;

  const prizes = settings.prizes ?? DEFAULT_SPIN_SETTINGS.prizes;
  const winSegment = winIndex !== null ? prizes[winIndex] : null;
  const expirationDays = settings.coupon_expiration_days ?? DEFAULT_SPIN_SETTINGS.coupon_expiration_days;
  const expiryDate = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
  const expiryStr = expiryDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const minPurchase = settings.minimum_purchase ?? DEFAULT_SPIN_SETTINGS.minimum_purchase;
  const popupTitle = settings.popup_title ?? DEFAULT_SPIN_SETTINGS.popup_title;
  const popupSubtitle = settings.popup_subtitle ?? DEFAULT_SPIN_SETTINGS.popup_subtitle;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Ruleta de premios"
    >
      {/* Close button */}
      <button
        onClick={dismiss}
        disabled={phase === 'spinning'}
        className={`fixed z-[10000] flex items-center justify-center w-11 h-11 rounded-full bg-sc-beige hover:bg-sc-border transition-colors shadow-md ${
          phase === 'spinning' ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
        }`}
        style={{
          top: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)',
          right: 'max(env(safe-area-inset-right, 0px) + 12px, 12px)',
        }}
        aria-label="Cerrar"
        aria-disabled={phase === 'spinning'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="#163317" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="relative bg-sc-cream rounded-card shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-sc-forest px-6 pt-6 pb-4 text-center">
          <p className="text-sc-cream/70 text-xs font-bold uppercase tracking-widest mb-1">🎉 Oferta exclusiva</p>
          <h2 className="text-sc-cream font-black text-2xl tracking-tightest leading-none">
            {popupTitle}
          </h2>
          <p className="text-sc-cream/70 text-sm mt-1">
            {popupSubtitle}
          </p>
        </div>

        {/* Wheel — only shown during spinning and result phases */}
        {(phase === 'spinning' || phase === 'result') && (
          <div className="flex justify-center items-center py-4 bg-sc-forest relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10" aria-hidden="true">
              <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
                <path d="M12 28L0 0h24L12 28z" fill="#EDE8E1" />
              </svg>
            </div>
            <WheelSVG rotation={rotation} prizes={prizes} />
          </div>
        )}

        <div className="px-6 pb-6">
          {/* ── FORM PHASE ── */}
          {phase === 'form' && (
            <form onSubmit={handleFormSubmit} noValidate className="space-y-4 pt-4">
              <div>
                <label htmlFor="spin-email" className="block text-sm font-semibold text-sc-forest mb-1">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  id="spin-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="tu@correo.com"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white ${
                    emailError ? 'border-red-400' : 'border-sc-border'
                  }`}
                  autoComplete="email"
                />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>

              <div>
                <label htmlFor="spin-nombre" className="block text-sm font-semibold text-sc-forest mb-1">
                  Nombre <span className="text-sc-muted text-xs font-normal">(opcional)</span>
                </label>
                <input
                  id="spin-nombre"
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full border border-sc-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white"
                  autoComplete="given-name"
                />
              </div>

              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => { setConsent(e.target.checked); setConsentError(''); }}
                    className="mt-0.5 w-4 h-4 rounded border-sc-border text-sc-forest focus:ring-sc-forest/30 flex-shrink-0"
                  />
                  <span className="text-xs text-sc-muted leading-relaxed">
                    Acepto recibir comunicaciones de marketing de Street Candy y el uso de mis datos según la{' '}
                    <a href="/privacidad" className="text-sc-forest underline" target="_blank" rel="noopener noreferrer">
                      política de privacidad
                    </a>
                    . <span className="text-red-500">*</span>
                  </span>
                </label>
                {consentError && <p className="text-red-500 text-xs mt-1 ml-6">{consentError}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sc-forest text-sc-cream font-bold py-3.5 rounded-pill text-sm hover:bg-sc-green transition-colors active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                    </svg>
                    Enviando código...
                  </>
                ) : (
                  '🎰 ¡Girar la ruleta!'
                )}
              </button>

              <p className="text-center text-xs text-sc-muted">
                Solo una vez por visitante. Válido en compras superiores a ${minPurchase.toLocaleString('es-CO')} COP.
              </p>
            </form>
          )}

          {/* ── OTP VERIFY PHASE ── */}
          {phase === 'otp_verify' && (
            <div className="pt-5 pb-2 space-y-5">
              {/* Icon + heading */}
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-sc-forest/10 flex items-center justify-center">
                    <span className="text-3xl">📧</span>
                  </div>
                </div>
                <p className="text-sc-forest font-black text-lg leading-tight">Verifica tu correo</p>
                <p className="text-sc-muted text-sm leading-relaxed">
                  Enviamos un código de 6 dígitos a{' '}
                  <strong className="text-sc-forest break-all">{pendingFormRef.current?.email}</strong>
                </p>
              </div>

              {/* OTP input form */}
              <form onSubmit={handleOTPVerify} noValidate className="space-y-4">
                <div>
                  <label htmlFor="otp-code" className="block text-sm font-semibold text-sc-forest mb-1">
                    Código de verificación <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      setOtpError('');
                    }}
                    placeholder="000000"
                    className={`w-full border rounded-lg px-3 py-3 text-center text-2xl font-mono font-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white ${
                      otpError ? 'border-red-400' : 'border-sc-border'
                    }`}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  {otpError && <p className="text-red-500 text-xs mt-1 text-center">{otpError}</p>}
                </div>

                {otpMessage && (
                  <p className={`text-xs px-3 py-2 rounded-lg text-center ${otpMessage.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {otpMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full bg-sc-forest text-sc-cream font-bold py-3.5 rounded-pill text-sm hover:bg-sc-green transition-colors active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {otpLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    '✅ Verificar y girar'
                  )}
                </button>
              </form>

              {/* Resend + back */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || otpSending}
                  className="w-full border border-sc-border text-sc-forest font-semibold py-2.5 rounded-pill text-sm hover:bg-sc-beige transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {otpSending ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                      </svg>
                      Enviando...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Reenviar código en ${resendCooldown}s`
                  ) : (
                    '📨 Reenviar código'
                  )}
                </button>
                <button
                  onClick={() => setPhase('form')}
                  className="w-full text-sc-muted text-xs py-1.5 hover:text-sc-forest transition-colors"
                >
                  ← Cambiar correo
                </button>
              </div>
            </div>
          )}

          {/* ── SPINNING PHASE ── */}
          {phase === 'spinning' && (
            <div className="pt-4 text-center">
              <p className="text-sc-forest font-bold text-lg animate-pulse">¡Girando…!</p>
              <p className="text-sc-muted text-sm mt-1">Espera tu premio 🎉</p>
            </div>
          )}

          {/* ── RESULT PHASE ── */}
          {phase === 'result' && winSegment && (
            <div className="pt-4 text-center space-y-4">
              {!saveError || couponCode ? (
                <>
                  <div>
                    <p className="text-sc-muted text-sm">🎉 ¡Felicitaciones! Ganaste</p>
                    <p className="text-sc-forest font-black text-3xl tracking-tightest mt-1">
                      {winSegment.label === 'Envío Gratis' ? '🚚 Envío Gratis' : `${winSegment.label} de descuento`}
                    </p>
                  </div>

                  {couponCode && (
                    <div className="bg-sc-beige rounded-card p-4 space-y-2">
                      <p className="text-sc-muted text-xs font-semibold uppercase tracking-widest">Tu código de descuento</p>
                      <p className="font-mono font-black text-sc-forest text-2xl tracking-widest">{couponCode}</p>
                      <button
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(couponCode).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                          }
                        }}
                        className="w-full bg-sc-forest text-sc-cream font-bold py-2.5 rounded-pill text-sm hover:bg-sc-green transition-colors active:scale-95 flex items-center justify-center gap-2"
                      >
                        {copied ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            ¡Copiado!
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M3 11V3h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Copiar código
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="text-xs text-sc-muted space-y-1">
                    <p>⏰ Válido hasta el <strong className="text-sc-forest">{expiryStr}</strong></p>
                    <p>🛒 Compra mínima: <strong className="text-sc-forest">${minPurchase.toLocaleString('es-CO')} COP</strong></p>
                    {winSegment.discountType === 'shipping' && (
                      <p className="text-sc-muted">* Envío gratis aplicado como descuento fijo de ${minPurchase.toLocaleString('es-CO')}</p>
                    )}
                  </div>
                </>
              ) : null}

              {saveError && (
                <p className="text-red-500 text-xs bg-red-50 rounded-lg p-2">{saveError}</p>
              )}

              <button
                onClick={dismiss}
                className="w-full border border-sc-border text-sc-forest font-semibold py-2.5 rounded-pill text-sm hover:bg-sc-beige transition-colors"
              >
                {couponCode ? 'Ir a comprar →' : 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
