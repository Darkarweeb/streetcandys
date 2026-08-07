'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatPriceValue, type Country } from '@/lib/price';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRY_KEY = 'sc_country';

// ─── Shipping option type (from dynamic config) ───────────────────────────────
interface ShippingOption {
  method_id: string;
  code: string;
  name: string;
  description: string | null;
  delivery_time: string | null;
  price: number;
  is_free: boolean;
  display_order: number;
}

interface ShippingConfig {
  free_shipping_threshold: number;
  currency_code: string;
  currency_symbol: string;
  options: ShippingOption[];
  same_day_available: boolean;
  same_day_message: string | null;
}

const TIP_OPTIONS = [
  { label: 'Sin propina', value: 0 },
  { label: '10%', value: 0.1 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
];

const PAYMENT_METHODS_CO = [
  { id: 'card', label: 'Tarjeta de crédito / débito', icon: '💳' },
  { id: 'nequi', label: 'Nequi', icon: '📱' },
  { id: 'pse', label: 'PSE', icon: '🏦' },
  { id: 'bancolombia', label: 'Bancolombia', icon: '🟡' },
];

const PAYMENT_METHODS_CR = [
  { id: 'card', label: 'Tarjeta de crédito / débito', icon: '💳' },
  { id: 'sinpe_movil', label: 'SINPE Móvil', icon: '📱' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  image: string;
}

interface CheckoutForm {
  nombre_completo: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  notas: string;
}

interface FormErrors {
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
}

interface CouponState {
  code: string | null;
  type: string | null;
  discount: number;
  loading: boolean;
  error: string | null;
}

const EMPTY_FORM: CheckoutForm = {
  nombre_completo: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  notas: '',
};

// ─── WhatsApp Message Builder ─────────────────────────────────────────────────
function buildWhatsAppMessage({
  numeroOrden,
  form,
  cartItems,
  subtotal,
  shipping,
  deliveryMethod,
  couponDiscount,
  couponCode,
  tax,
  tipAmount,
  total,
  country,
  paymentMethod,
}: {
  numeroOrden: string;
  form: CheckoutForm;
  cartItems: CartItem[];
  subtotal: number;
  shipping: number;
  deliveryMethod: string;
  couponDiscount: number;
  couponCode: string | null;
  tax: number;
  tipAmount: number;
  total: number;
  country: Country;
  paymentMethod: string;
}): string {
  const currency = country === 'CO' ? 'COP' : 'CRC';

  const fmt = (n: number): string => {
    try {
      return n.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
    } catch {
      const symbol = country === 'CO' ? '$' : '₡';
      return `${symbol}${Math.round(n).toLocaleString('es-CO')}`;
    }
  };

  const methodLabels: Record<string, string> = {
    standard: 'Envío estándar',
    express: 'Envío express',
    same_day: 'Mismo día',
  };

  const paymentLabels: Record<string, string> = {
    card: 'Tarjeta de crédito / débito',
    nequi: 'Nequi',
    pse: 'PSE',
    bancolombia: 'Bancolombia',
    sinpe_movil: 'SINPE Móvil',
  };

  const lines: string[] = [
    `========================================`,
    `🛍️  STREET CANDY'S ORDER`,
    `========================================`,
    ``,
    `📋 Orden: ${numeroOrden}`,
    ``,
    `📦 PRODUCTOS`,
    `----------------------------------------`,
  ];

  if (cartItems.length > 0) {
    cartItems.forEach((item) => {
      const unitPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      const lineTotal = unitPrice * item.qty;
      lines.push(`• ${item.name}`);
      lines.push(`  Cantidad: ${item.qty}  |  Precio unit.: ${fmt(unitPrice)}  |  Total: ${fmt(lineTotal)}`);
    });
  } else {
    lines.push('  (sin productos)');
  }

  lines.push(
    ``,
    `----------------------------------------`,
    `  Subtotal:         ${fmt(subtotal)}`,
    `  Método de envío:  ${methodLabels[deliveryMethod] ?? deliveryMethod}`,
    `  Costo de envío:   ${shipping === 0 ? 'Gratis' : fmt(shipping)}`,
  );

  if (couponCode) {
    lines.push(`  Cupón:            ${couponCode}`);
    if (couponDiscount > 0) {
      lines.push(`  Descuento:        -${fmt(couponDiscount)}`);
    }
  }

  if (tipAmount > 0) {
    lines.push(`  Propina:          ${fmt(tipAmount)}`);
  }

  if (tax > 0) {
    lines.push(`  Impuestos:        ${fmt(tax)}`);
  }

  lines.push(
    `  ──────────────────────────────────────`,
    `  TOTAL:            ${fmt(total)}`,
    ``,
    `----------------------------------------`,
    `👤 CLIENTE`,
    `----------------------------------------`,
    `  Nombre:           ${form.nombre_completo}`,
    `  Teléfono:         ${form.telefono}`,
    `  Email:            ${form.email}`,
    `  País:             ${country === 'CO' ? '🇨🇴 Colombia' : '🇨🇷 Costa Rica'}`,
    `  Depto/Provincia:  ${form.departamento}`,
    `  Ciudad:           ${form.ciudad}`,
    `  Dirección:        ${form.direccion}`,
  );

  if (form.notas) {
    lines.push(`  Instrucciones:    ${form.notas}`);
  }

  lines.push(
    ``,
    `----------------------------------------`,
    `💳 MÉTODO DE PAGO`,
    `----------------------------------------`,
    `  ${paymentLabels[paymentMethod] ?? paymentMethod}`,
    ``,
    `========================================`,
    `¡Gracias por tu pedido en Street Candy's! 🍬`,
    `Te contactaremos pronto para confirmar tu entrega.`,
    `========================================`,
  );

  return lines.join('\n');
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm(form: CheckoutForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.nombre_completo.trim()) errors.nombre_completo = 'El nombre completo es requerido';
  else if (form.nombre_completo.trim().length < 3) errors.nombre_completo = 'El nombre debe tener al menos 3 caracteres';
  if (!form.email.trim()) {
    errors.email = 'El correo electrónico es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Ingresa un correo electrónico válido';
  }
  if (!form.telefono.trim()) {
    errors.telefono = 'El teléfono es requerido';
  } else if (!/^[\d\s+\-()]{7,15}$/.test(form.telefono.trim())) {
    errors.telefono = 'Ingresa un número de teléfono válido';
  }
  if (!form.direccion.trim()) errors.direccion = 'La dirección es requerida';
  else if (form.direccion.trim().length < 5) errors.direccion = 'Ingresa una dirección válida (mínimo 5 caracteres)';
  if (!form.ciudad.trim()) errors.ciudad = 'La ciudad es requerida';
  else if (form.ciudad.trim().length < 2) errors.ciudad = 'Ingresa una ciudad válida';
  if (!form.departamento.trim()) errors.departamento = 'El departamento es requerido';
  else if (form.departamento.trim().length < 2) errors.departamento = 'Ingresa un departamento válido';
  return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InputField({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  name: keyof CheckoutForm;
  value: string;
  onChange: (name: keyof CheckoutForm, value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  // Map input type to appropriate inputMode for mobile keyboards
  const inputModeMap: Record<string, React.HTMLAttributes<HTMLInputElement>['inputMode']> = {
    email: 'email',
    tel: 'tel',
    number: 'numeric',
    text: 'text',
  };
  const inputMode = inputModeMap[type] ?? 'text';
  const autoCompleteMap: Record<string, string> = {
    nombre_completo: 'name',
    email: 'email',
    telefono: 'tel',
    direccion: 'street-address',
    ciudad: 'address-level2',
    departamento: 'address-level1',
    notas: 'off',
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sc-forest text-sm font-semibold">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoCompleteMap[name] ?? 'off'}
        className={`w-full px-4 py-3 rounded-xl border text-sc-forest text-sm bg-white placeholder-sc-muted focus:outline-none focus:ring-2 transition-all min-h-[48px] ${
          error
            ? 'border-red-400 focus:ring-red-200' :'border-sc-beige focus:ring-sc-forest/20 focus:border-sc-forest'
        }`}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={error ? 'true' : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="text-red-500 text-xs font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-sc-beige p-6 lg:p-8 space-y-5">
      <h2 className="text-sc-forest font-bold text-lg">{title}</h2>
      {children}
    </section>
  );
}

// ─── Delivery Method Section (Dynamic) ───────────────────────────────────────
const METHOD_ICONS: Record<string, React.ReactNode> = {
  standard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 7h11v8H2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13 9h3l2 3v3h-5V9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="5.5" cy="16.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="14.5" cy="16.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  express: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l1.5 5H17l-4.5 3.3 1.7 5.2L10 13.5l-4.2 3 1.7-5.2L3 8h5.5L10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  same_day: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 5v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

function DeliveryMethodSection({
  selected,
  onSelect,
  country,
  shippingConfig,
  shippingLoading,
}: {
  selected: string;
  onSelect: (code: string) => void;
  country: Country;
  shippingConfig: ShippingConfig | null;
  shippingLoading: boolean;
}) {
  if (shippingLoading) {
    return (
      <SectionCard title="Método de entrega">
        <div className="flex items-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-sc-forest border-t-transparent rounded-full animate-spin" />
          <span className="text-sc-muted text-sm">Calculando opciones de envío...</span>
        </div>
      </SectionCard>
    );
  }

  const options = shippingConfig?.options ?? [];

  if (options.length === 0) {
    return (
      <SectionCard title="Método de entrega">
        <p className="text-sc-muted text-sm">No hay métodos de envío disponibles para tu región.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Método de entrega">
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selected === option.code;
          const icon = METHOD_ICONS[option.code] ?? METHOD_ICONS['standard'];
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => onSelect(option.code)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-sc-forest bg-sc-forest/5'
                  : 'border-sc-beige bg-white hover:border-sc-forest/30'
              }`}
              aria-pressed={isSelected}
            >
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-sc-forest text-sc-cream' : 'bg-sc-beige text-sc-forest'
                }`}
              >
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sc-forest text-sm font-semibold">{option.name}</p>
                <p className="text-sc-muted text-xs">{option.delivery_time ?? option.description}</p>
              </div>
              <span className="text-sc-forest text-sm font-bold flex-shrink-0">
                {option.is_free || option.price === 0 ? (
                  <span className="text-sc-green">Gratis</span>
                ) : (
                  formatPriceValue(option.price, country)
                )}
              </span>
              <span
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-sc-forest' : 'border-sc-border'
                }`}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-sc-forest block" />
                )}
              </span>
            </button>
          );
        })}
      </div>
      {shippingConfig?.same_day_message && shippingConfig.same_day_available && (
        <p className="text-sc-muted text-xs mt-2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {shippingConfig.same_day_message}
        </p>
      )}
    </SectionCard>
  );
}

// ─── Tip Section ──────────────────────────────────────────────────────────────
function TipSection({
  subtotal,
  tipRate,
  customTip,
  onTipRateChange,
  onCustomTipChange,
  country,
}: {
  subtotal: number;
  tipRate: number | 'custom';
  customTip: string;
  onTipRateChange: (v: number | 'custom') => void;
  onCustomTipChange: (v: string) => void;
  country: Country;
}) {
  const tipAmount =
    tipRate === 'custom'
      ? parseFloat(customTip.replace(/[^0-9.]/g, '')) || 0
      : subtotal * tipRate;

  return (
    <SectionCard title="Propina para el repartidor">
      <p className="text-sc-muted text-xs -mt-2">100% va al repartidor. ¡Gracias por tu apoyo!</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIP_OPTIONS.map((opt) => {
          const isSelected = tipRate === opt.value && tipRate !== 'custom';
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTipRateChange(opt.value)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                isSelected
                  ? 'border-sc-forest bg-sc-forest text-sc-cream'
                  : 'border-sc-beige bg-white text-sc-forest hover:border-sc-forest/40'
              }`}
              aria-pressed={isSelected}
            >
              {opt.label}
              {opt.value > 0 && (
                <span className="block text-xs font-normal opacity-75">
                  {formatPriceValue(subtotal * opt.value, country)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onTipRateChange('custom')}
          className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all flex-shrink-0 ${
            tipRate === 'custom' ?'border-sc-forest bg-sc-forest text-sc-cream' :'border-sc-beige bg-white text-sc-forest hover:border-sc-forest/40'
          }`}
          aria-pressed={tipRate === 'custom'}
        >
          Otro monto
        </button>
        {tipRate === 'custom' && (
          <input
            type="number"
            min="0"
            value={customTip}
            onChange={(e) => onCustomTipChange(e.target.value)}
            placeholder="Ingresa monto"
            className="flex-1 px-4 py-2.5 rounded-xl border border-sc-beige text-sc-forest text-sm bg-white placeholder-sc-muted focus:outline-none focus:ring-2 focus:ring-sc-forest/20 focus:border-sc-forest transition-all"
            aria-label="Monto personalizado de propina"
          />
        )}
      </div>
      {tipAmount > 0 && (
        <p className="text-sc-green text-sm font-semibold">
          Propina: {formatPriceValue(tipAmount, country)}
        </p>
      )}
    </SectionCard>
  );
}

// ─── Coupon Section ───────────────────────────────────────────────────────────
function CouponSection({
  coupon,
  couponInput,
  onInputChange,
  onApply,
  onRemove,
  country,
}: {
  coupon: CouponState;
  couponInput: string;
  onInputChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  country: Country;
}) {
  return (
    <SectionCard title="Cupón de descuento">
      {coupon.code ? (
        <div className="flex items-center justify-between bg-sc-green/10 border border-sc-green/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sc-green flex-shrink-0" aria-hidden="true">
              <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-sc-forest text-sm font-bold font-mono">{coupon.code}</p>
              {coupon.type === 'shipping' ? (
                <p className="text-sc-green text-xs font-medium">Envío gratis aplicado</p>
              ) : coupon.discount > 0 ? (
                <p className="text-sc-green text-xs font-medium">
                  -{formatPriceValue(coupon.discount, country)} de descuento
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-sc-muted hover:text-red-500 transition-colors text-xs font-medium underline"
            aria-label="Eliminar cupón"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => onInputChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            placeholder="Código de cupón"
            className="flex-1 px-4 py-3 rounded-xl border border-sc-beige text-sc-forest text-sm bg-white placeholder-sc-muted focus:outline-none focus:ring-2 focus:ring-sc-forest/20 focus:border-sc-forest transition-all font-mono uppercase"
            aria-label="Código de cupón"
          />
          <button
            type="button"
            onClick={onApply}
            disabled={coupon.loading || !couponInput.trim()}
            className="px-5 py-3 bg-sc-forest text-sc-cream text-sm font-bold rounded-xl hover:bg-sc-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {coupon.loading ? (
              <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin inline-block" aria-label="Aplicando..." />
            ) : (
              'Aplicar'
            )}
          </button>
        </div>
      )}
      {coupon.error && (
        <p className="text-red-500 text-xs font-medium" role="alert">{coupon.error}</p>
      )}
    </SectionCard>
  );
}

// ─── Payment Method Section ───────────────────────────────────────────────────
function PaymentMethodSection({
  selected,
  onSelect,
  country,
}: {
  selected: string;
  onSelect: (id: string) => void;
  country: Country;
}) {
  const methods = country === 'CR' ? PAYMENT_METHODS_CR : PAYMENT_METHODS_CO;

  return (
    <SectionCard title="Método de pago">
      <div className="space-y-2.5">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-sc-forest bg-sc-forest/5'
                  : 'border-sc-beige bg-white hover:border-sc-forest/30'
              }`}
              aria-pressed={isSelected}
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">{method.icon}</span>
              <span className="flex-1 text-sc-forest text-sm font-semibold">{method.label}</span>
              <span
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-sc-forest' : 'border-sc-border'
                }`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-sc-forest block" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-sc-muted text-xs flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1L1.5 3v3.5C1.5 9 3.5 10.8 6 11.5c2.5-.7 4.5-2.5 4.5-5V3L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
        Tus datos de pago están cifrados y protegidos con SSL.
      </p>
    </SectionCard>
  );
}

// ─── Order Summary Sidebar ────────────────────────────────────────────────────
function OrderSummary({
  cartItems,
  totalQty,
  subtotal,
  shipping,
  tax,
  couponDiscount,
  tipAmount,
  deliverySurcharge,
  total,
  country,
  threshold,
  couponCode,
  couponType,
}: {
  cartItems: CartItem[];
  totalQty: number;
  subtotal: number;
  shipping: number;
  tax: number;
  couponDiscount: number;
  tipAmount: number;
  deliverySurcharge: number;
  total: number;
  country: Country;
  threshold: number;
  couponCode: string | null;
  couponType: string | null;
}) {
  return (
    <aside className="lg:sticky lg:top-24" aria-label="Resumen del pedido">
      <div className="bg-white rounded-2xl border border-sc-beige overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-sc-beige">
          <h2 className="text-sc-forest font-bold text-lg">Resumen del pedido</h2>
          <p className="text-sc-muted text-sm mt-0.5">{totalQty} producto{totalQty !== 1 ? 's' : ''}</p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto overscroll-contain scrollbar-hide">
          {cartItems.map((item) => {
            const unitPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
            const lineTotal = unitPrice * item.qty;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-sc-beige">
                    <img
                      src={item.image}
                      alt={`${item.name} en el carrito`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-sc-forest text-sc-cream text-[10px] font-bold rounded-full flex items-center justify-center"
                    aria-label={`Cantidad: ${item.qty}`}
                  >
                    {item.qty}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sc-forest text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-sc-muted text-xs">{item.price} c/u</p>
                </div>
                <p className="text-sc-forest text-sm font-bold flex-shrink-0">
                  {formatPriceValue(lineTotal, country)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Coupon badge */}
        {couponCode && (
          <div className="px-6 py-3 bg-sc-beige/40 border-t border-sc-beige flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-green flex-shrink-0" aria-hidden="true">
              <path d="M1 7l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sc-forest text-xs font-semibold">Cupón:</span>
            <span className="text-sc-green text-xs font-bold font-mono">{couponCode}</span>
            {couponType === 'shipping' && (
              <span className="text-sc-green text-xs font-medium ml-1">— Envío gratis</span>
            )}
          </div>
        )}

        {/* Totals breakdown */}
        <div className="px-6 py-5 border-t border-sc-beige space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-sc-muted">Subtotal</span>
            <span className="text-sc-forest font-semibold">{formatPriceValue(subtotal, country)}</span>
          </div>

          {deliverySurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sc-muted">Recargo express</span>
              <span className="text-sc-forest font-semibold">+{formatPriceValue(deliverySurcharge, country)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-sc-muted">Envío</span>
            {shipping === 0 ? (
              <span className="text-sc-green font-semibold">Gratis 🎉</span>
            ) : (
              <span className="text-sc-forest font-semibold">{formatPriceValue(shipping, country)}</span>
            )}
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sc-muted">Descuento cupón</span>
              <span className="text-sc-green font-semibold">-{formatPriceValue(couponDiscount, country)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sc-muted">
                Impuestos ({country === 'CO' ? '19%' : '13%'})
              </span>
              <span className="text-sc-forest font-semibold">{formatPriceValue(tax, country)}</span>
            </div>
          )}

          {tipAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sc-muted">Propina</span>
              <span className="text-sc-forest font-semibold">{formatPriceValue(tipAmount, country)}</span>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-sc-beige">
            <span className="text-sc-forest font-bold text-base">Total</span>
            <span className="text-sc-forest font-black text-lg">{formatPriceValue(total, country)}</span>
          </div>
        </div>

        {/* Free shipping progress */}
        {shipping > 0 && (
          <div className="px-6 pb-5">
            <p className="text-sc-muted text-xs mb-2">
              Agrega{' '}
              <strong className="text-sc-forest">{formatPriceValue(threshold - subtotal, country)}</strong>
              {' '}más para obtener envío gratis
            </p>
            <div className="h-1.5 bg-sc-beige rounded-full overflow-hidden">
              <div
                className="h-full bg-sc-forest rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round((subtotal / threshold) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Security badges */}
        <div className="px-6 pb-5 flex items-center justify-center gap-5 text-sc-muted">
          <div className="flex items-center gap-1.5 text-xs">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1L2 3.5v4c0 2.5 2 4.5 5 5.5 3-1 5-3 5-5.5v-4L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            Pago seguro
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Pago protegido
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { settings: waSettings, loading: waSettingsLoading } = useWhatsAppSettings();

  // Core state
  const [country, setCountry] = useState<Country>('CO');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [carritoId, setCarritoId] = useState<string | null>(null);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);

  // Dynamic shipping config
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  // New checkout-specific state
  const [deliveryMethod, setDeliveryMethod] = useState<string>('standard');
  const [tipRate, setTipRate] = useState<number | 'custom'>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [couponInput, setCouponInput] = useState<string>('');
  const [coupon, setCoupon] = useState<CouponState>({
    code: null,
    type: null,
    discount: 0,
    loading: false,
    error: null,
  });

  // Idempotency key — stable per page load, prevents duplicate orders on retry
  const idempotencyKeyRef = useRef<string>('');
  useEffect(() => {
    idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const storedCountry = localStorage.getItem(COUNTRY_KEY) as Country | null;
    const activeCountry: Country =
      storedCountry === 'CO' || storedCountry === 'CR' ? storedCountry : 'CO';
    setCountry(activeCountry);

    (async () => {
      try {
        // ── Read items from localStorage snapshot (same source as CartDrawer) ──
        const snapshot = (() => {
          try {
            const raw = localStorage.getItem('sc_cart_snapshot');
            if (!raw) return null;
            return JSON.parse(raw) as { items?: Array<{ id: string; name: string; price: string; qty: number; image: string }> };
          } catch { return null; }
        })();

        if (snapshot?.items && snapshot.items.length > 0) {
          setCartItems(snapshot.items.map((item) => ({
            id: item.id,
            name: item.name ?? '',
            price: item.price ?? '',
            qty: item.qty ?? 1,
            image: item.image ?? '',
          })));
        }

        // ── Fetch API only for carritoId and coupon ──
        const sessionId = localStorage.getItem('sc_session_id') ?? undefined;
        const res = await fetch(`/api/carrito?pais=${activeCountry}`, {
          headers: sessionId ? { 'x-session-id': sessionId } : {},
        });
        const data = await res.json();
        if (data.exito && data.datos) {
          const cartData = data.datos;
          setCarritoId(cartData.id ?? null);

          // Only use API items if localStorage snapshot was empty
          if (!snapshot?.items || snapshot.items.length === 0) {
            const items: CartItem[] = (cartData.items ?? []).map((item: {
              id: string;
              producto_id?: string;
              nombre?: string;
              name?: string;
              precio?: number;
              price?: string;
              cantidad?: number;
              qty?: number;
              imagen_url?: string;
              image?: string;
            }) => ({
              id: item.producto_id ?? item.id,
              name: item.nombre ?? item.name ?? '',
              price: item.price ?? formatPriceValue(item.precio ?? 0, activeCountry),
              qty: item.cantidad ?? item.qty ?? 1,
              image: item.imagen_url ?? item.image ?? '',
            }));
            setCartItems(items);
          }

          const cupon = cartData.cupon ?? null;
          if (cupon) {
            setCoupon({
              code: cupon.codigo ?? null,
              type: cupon.tipo_descuento ?? null,
              discount: cupon.descuento_calculado ?? 0,
              loading: false,
              error: null,
            });
          }
        }
      } catch {
        // cart fetch failed — leave empty
      } finally {
        setCartLoading(false);
      }
    })();
  }, []);

  // Pre-fill form from profile
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        nombre_completo: profile.fullName ?? prev.nombre_completo,
        email: user?.email ?? prev.email,
        telefono: profile.phone ?? prev.telefono,
      }));
    } else if (user) {
      setForm((prev) => ({ ...prev, email: user.email ?? prev.email }));
    }
  }, [user, profile]);

  // Reset payment method when country changes
  useEffect(() => {
    setPaymentMethod('card');
  }, [country]);

  // ── Fetch dynamic shipping config ──────────────────────────────────────────
  const fetchShippingConfig = useCallback(async (countryCode: string, region: string, sub: number) => {
    setShippingLoading(true);
    try {
      const params = new URLSearchParams({ country: countryCode, subtotal: String(sub) });
      if (region) params.set('region', region);
      const res = await fetch(`/api/shipping/calculate?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setShippingConfig(json.data);
        // Auto-select first available method if current selection not available
        const available = (json.data.options ?? []).map((o: ShippingOption) => o.code);
        setDeliveryMethod((prev) => available.includes(prev) ? prev : (available[0] ?? 'standard'));
      }
    } catch {
      // fallback: keep existing config
    } finally {
      setShippingLoading(false);
    }
  }, []);

  const handleChange = useCallback((name: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  // ── Coupon handlers ────────────────────────────────────────────────────────
  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    // Always use the already-loaded carritoId — never re-resolve
    if (!carritoId) {
      setCoupon((prev) => ({ ...prev, loading: false, error: 'El carrito no está listo. Recarga la página.' }));
      return;
    }
    setCoupon((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sessionId = localStorage.getItem('sc_session_id') ?? undefined;
      const res = await fetch('/api/carrito/cupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
        },
        body: JSON.stringify({
          codigo: couponInput.trim(),
          pais: country,
          carrito_id: carritoId,
        }),
      });
      const data = await res.json();
      if (!data.exito) {
        setCoupon((prev) => ({ ...prev, loading: false, error: data.error ?? `Cupón inválido: ${formatPriceValue(0, country)}` }));
        return;
      }
      const cupon = data.datos?.cupon ?? null;
      const descuento =
        data.datos?.resumen?.descuento_cupon ??
        cupon?.descuento_calculado ??
        0;
      setCoupon({
        code: cupon?.codigo ?? couponInput.trim(),
        type: cupon?.tipo_descuento ?? null,
        discount: descuento,
        loading: false,
        error: null,
      });
      setCouponInput('');
    } catch {
      setCoupon((prev) => ({ ...prev, loading: false, error: 'Error al aplicar el cupón' }));
    }
  }, [couponInput, country, carritoId]);

  const handleRemoveCoupon = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('sc_session_id') ?? undefined;
      await fetch(`/api/carrito/cupon?pais=${country}`, {
        method: 'DELETE',
        headers: sessionId ? { 'x-session-id': sessionId } : {},
      });
    } catch {
      // best-effort
    }
    setCoupon({ code: null, type: null, discount: 0, loading: false, error: null });
  }, [country]);

  // ── Pricing calculations ───────────────────────────────────────────────────
  const threshold = shippingConfig?.free_shipping_threshold ?? (country === 'CO' ? 350000 : 45000);

  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        return sum + price * item.qty;
      }, 0),
    [cartItems],
  );

  // Fetch shipping config whenever country, region, or subtotal changes
  useEffect(() => {
    if (!mounted) return;
    const region = form.departamento?.trim() || '';
    fetchShippingConfig(country, region, subtotal);
  }, [country, form.departamento, subtotal, mounted, fetchShippingConfig]);

  const deliverySurcharge = useMemo(() => {
    // With dynamic config, the price already includes the full cost per method
    return 0;
  }, []);

  const shippingFreeViaCoupon = coupon.type === 'shipping';

  const selectedOption = shippingConfig?.options?.find((o) => o.code === deliveryMethod);
  const baseShipping = shippingFreeViaCoupon
    ? 0
    : selectedOption
    ? selectedOption.price
    : (subtotal >= threshold ? 0 : (country === 'CO' ? 12000 : 3500));
  const shipping = baseShipping;

  const couponDiscount = coupon.discount;

  const taxRate = shippingConfig
    ? 0  // tax is handled server-side; keep 0 for display consistency
    : (country === 'CO' ? 0.19 : 0.13);
  const taxableBase = Math.max(0, subtotal - couponDiscount);
  const tax = Math.round(taxableBase * (country === 'CO' ? 0.19 : 0.13));

  const tipAmount = useMemo(() => {
    if (tipRate === 'custom') return parseFloat(customTip.replace(/[^0-9.]/g, '')) || 0;
    return Math.round(subtotal * tipRate);
  }, [tipRate, customTip, subtotal]);

  const total = subtotal + shipping - couponDiscount + tax + tipAmount;
  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (submitting) return;

    if (cartItems.length === 0) {
      setSubmitError('Tu carrito está vacío. Agrega productos antes de continuar.');
      return;
    }

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (total <= 0) {
      setSubmitError('El total del pedido no es válido. Revisa los productos y descuentos.');
      return;
    }

    // Guard: carritoId must already be loaded — never re-resolve
    if (!carritoId) {
      setSubmitError('El carrito no está listo. Recarga la página e intenta de nuevo.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        carrito_id: carritoId,
        codigo_pais: country,
        email_contacto: !user ? form.email : undefined,
        metodo_pago: paymentMethod,
        metodo_entrega: deliveryMethod,
        propina: tipAmount > 0 ? tipAmount : undefined,
        direccion_envio: {
          nombre_completo: form.nombre_completo,
          telefono: form.telefono,
          linea1: form.direccion,
          ciudad: form.ciudad,
          departamento_provincia: form.departamento,
          codigo_pais: country,
        },
        notas: form.notas || undefined,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.exito) throw new Error(data.error ?? 'Error al procesar el pedido');

      idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const ordenId: string = data.datos?.orden_id ?? data.datos?.id ?? '';
      const numeroOrden: string = data.datos?.numero_orden ?? '';

      if (country === 'CR') {
        // Build WhatsApp message from existing checkout state
        const waMessage = buildWhatsAppMessage({
          numeroOrden,
          form,
          cartItems,
          subtotal,
          shipping,
          deliveryMethod,
          couponDiscount,
          couponCode: coupon.code,
          tax,
          tipAmount,
          total,
          country,
          paymentMethod,
        });

        // Use hardcoded business number (573115397983) as primary, fall back to settings
        const rawPhone = waSettings?.phone?.replace(/\D/g, '') || '573115397983';
        const phoneNumber = rawPhone || '573115397983';
        const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(waMessage)}`;

        // Navigate directly — no window.open('', '_blank') pre-open
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = waUrl;
        } else {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
      }

      router.push(`/orden-confirmada/${ordenId}?numero=${encodeURIComponent(numeroOrden)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pedido';
      setSubmitError(msg);
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!mounted || cartLoading) {
    return (
      <div className="min-h-screen bg-sc-cream flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-sc-forest border-t-transparent rounded-full animate-spin"
          aria-label="Cargando"
        />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sc-cream flex flex-col overflow-x-hidden">
      <Navigation
        cartCount={totalQty}
        onCartOpen={() => router.back()}
        onCountryChange={(c) => setCountry(c as Country)}
        country={country}
      />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 lg:px-8 py-8 lg:py-16">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm text-sc-muted mb-8"
          aria-label="Navegación de migas de pan"
        >
          <Link href="/" className="hover:text-sc-forest transition-colors">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span className="text-sc-forest font-semibold">Finalizar compra</span>
        </nav>

        <h1 className="text-sc-forest font-black text-3xl lg:text-4xl tracking-tightest mb-10">
          Finalizar compra
        </h1>

        {cartItems.length === 0 ? (
          /* Empty cart */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-sc-beige flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 64 64" fill="none" className="text-sc-muted" aria-hidden="true">
                <path d="M8 8h6l9.6 38.4a4 4 0 004 3.2h28.8a4 4 0 003.84-2.88L56 24H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="28" cy="56" r="4" fill="currentColor"/>
                <circle cx="52" cy="56" r="4" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="text-sc-forest font-bold text-xl mb-2">Tu carrito está vacío</p>
              <p className="text-sc-muted text-sm">Agrega productos antes de continuar con el pago.</p>
            </div>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-sc-forest text-sc-cream font-bold px-8 py-3 rounded-pill hover:bg-sc-green transition-colors"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-14 items-start">
            {/* ── Left: Form ── */}
            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* 1. Contact info */}
              <SectionCard title="Información de contacto">
                {!user && (
                  <p className="text-sc-muted text-sm -mt-2">
                    ¿Ya tienes cuenta?{' '}
                    <Link
                      href="/iniciar-sesion?next=/checkout"
                      className="text-sc-forest font-semibold underline hover:opacity-70"
                    >
                      Inicia sesión
                    </Link>{' '}
                    para autocompletar tus datos.
                  </p>
                )}
                <InputField
                  label="Nombre completo"
                  name="nombre_completo"
                  value={form.nombre_completo}
                  onChange={handleChange}
                  error={errors.nombre_completo}
                  placeholder="Ej: María García López"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Correo electrónico"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                  <InputField
                    label="Teléfono"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    error={errors.telefono}
                    type="tel"
                    placeholder="Ej: 300 123 4567"
                    required
                  />
                </div>
              </SectionCard>

              {/* 2. Delivery address */}
              <SectionCard title="Dirección de envío">
                <InputField
                  label="Dirección"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  error={errors.direccion}
                  placeholder="Calle, número, apto, barrio"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Ciudad"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    error={errors.ciudad}
                    placeholder="Ej: Bogotá"
                    required
                  />
                  <InputField
                    label="Departamento / Provincia"
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    error={errors.departamento}
                    placeholder="Ej: Cundinamarca"
                    required
                  />
                </div>
              </SectionCard>

              {/* 3. Delivery instructions */}
              <SectionCard title="Instrucciones de entrega">
                <div className="flex flex-col gap-1.5 -mt-2">
                  <label htmlFor="notas" className="text-sc-forest text-sm font-semibold">
                    Notas para el repartidor{' '}
                    <span className="text-sc-muted font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="notas"
                    value={form.notas}
                    onChange={(e) => handleChange('notas', e.target.value)}
                    placeholder="Ej: Timbre no funciona, llamar al llegar. Dejar en portería si no hay nadie."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-sc-beige text-sc-forest text-sm bg-white placeholder-sc-muted focus:outline-none focus:ring-2 focus:ring-sc-forest/20 focus:border-sc-forest transition-all resize-none"
                  />
                </div>
              </SectionCard>

              {/* 4. Delivery method */}
              <DeliveryMethodSection
                selected={deliveryMethod}
                onSelect={setDeliveryMethod}
                country={country}
                shippingConfig={shippingConfig}
                shippingLoading={shippingLoading}
              />

              {/* 5. Tip */}
              <TipSection
                subtotal={subtotal}
                tipRate={tipRate}
                customTip={customTip}
                onTipRateChange={setTipRate}
                onCustomTipChange={setCustomTip}
                country={country}
              />

              {/* 6. Coupon */}
              <CouponSection
                coupon={coupon}
                couponInput={couponInput}
                onInputChange={setCouponInput}
                onApply={handleApplyCoupon}
                onRemove={handleRemoveCoupon}
                country={country}
              />

              {/* 7. Payment method */}
              <PaymentMethodSection
                selected={paymentMethod}
                onSelect={setPaymentMethod}
                country={country}
              />

              {/* Submit error */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
                  <p className="text-red-700 text-sm font-medium">{submitError}</p>
                </div>
              )}

              {/* CR informational notice */}
              {country === 'CR' && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="text-blue-800 text-xs leading-relaxed">
                    <strong>Pagos con tarjeta próximamente en Costa Rica</strong> — completa tu pedido por WhatsApp.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || (country === 'CR' && waSettingsLoading)}
                className="w-full bg-sc-forest text-sc-cream font-bold py-4 rounded-pill hover:bg-sc-green active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed text-base min-h-[56px]"
              >
                {submitting ? (
                  <>
                    <span
                      className="w-5 h-5 border-2 border-sc-cream border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Procesando pedido...
                  </>
                ) : country === 'CR' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Completar pedido por WhatsApp
                  </>
                ) : (
                  <>
                    Confirmar pedido
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>

              {/* WhatsApp confirmation note */}
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <p className="text-green-800 text-xs leading-relaxed">
                  <strong>Confirmación por WhatsApp:</strong> Después de confirmar, el equipo de Street Candy&apos;s se comunicará contigo por WhatsApp para coordinar el pago y la entrega.
                </p>
              </div>

              <p className="text-sc-muted text-xs text-center">
                Al confirmar tu pedido aceptas nuestros{' '}
                <Link href="/terminos" className="underline hover:text-sc-forest">
                  Términos y Condiciones
                </Link>
                {' '}y{' '}
                <Link href="/privacidad" className="underline hover:text-sc-forest">
                  Política de Privacidad
                </Link>
                . Debes ser mayor de edad para realizar compras.
              </p>
            </form>

            {/* ── Right: Order Summary ── */}
            <OrderSummary
              cartItems={cartItems}
              totalQty={totalQty}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              couponDiscount={couponDiscount}
              tipAmount={tipAmount}
              deliverySurcharge={deliverySurcharge}
              total={total}
              country={country}
              threshold={threshold}
              couponCode={coupon.code}
              couponType={coupon.type}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
