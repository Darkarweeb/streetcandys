/**
 * Street Candy's — Email Sending Functions
 * Centralized email dispatch using Resend SDK
 * All functions are fire-and-forget safe — errors are logged but never thrown
 */

import { getResendClient, FROM_EMAIL, REPLY_TO } from './client';
import { getWelcomeEmailHtml, getWelcomeEmailText, type WelcomeEmailData } from './templates/welcome';
import {
  getOrderConfirmationHtml,
  getOrderProcessingHtml,
  getOrderShippedHtml,
  getOrderDeliveredHtml,
  type OrderEmailData,
} from './templates/order';
import { getPointsEarnedHtml, type RewardsEmailData } from './templates/rewards';

// ─── Result type ────────────────────────────────────────────────────────────

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Safe send wrapper ───────────────────────────────────────────────────────

async function safeSend(payload: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: payload.from,
      to: payload.to,
      reply_to: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      console.error('[email] Resend API error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[email] Failed to send email:', message);
    return { success: false, error: message };
  }
}

// ─── Welcome Email ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: "¡Bienvenido al Crew! 🍬 — Street Candy's",
    html: getWelcomeEmailHtml(data),
    text: getWelcomeEmailText(data),
  });
}

// ─── Order Emails ────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: `¡Pedido Confirmado! #${data.orderNumber} — Street Candy's`,
    html: getOrderConfirmationHtml(data),
  });
}

export async function sendOrderProcessingEmail(data: OrderEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: `Preparando tu Pedido #${data.orderNumber} — Street Candy's`,
    html: getOrderProcessingHtml(data),
  });
}

export async function sendOrderShippedEmail(data: OrderEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: `¡Tu Pedido #${data.orderNumber} va en Camino! 🚚 — Street Candy's`,
    html: getOrderShippedHtml(data),
  });
}

export async function sendOrderDeliveredEmail(data: OrderEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: `¡Pedido #${data.orderNumber} Entregado! ✅ — Street Candy's`,
    html: getOrderDeliveredHtml(data),
  });
}

// ─── Rewards Emails ──────────────────────────────────────────────────────────

export async function sendPointsEarnedEmail(data: RewardsEmailData): Promise<EmailResult> {
  return safeSend({
    from: FROM_EMAIL,
    to: data.email,
    replyTo: REPLY_TO,
    subject: `¡Ganaste ${data.pointsEarned} puntos! 🏆 — Street Candy's`,
    html: getPointsEarnedHtml(data),
  });
}
