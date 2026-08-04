/**
 * Street Candy's — Resend Email Client
 * Centralized Resend SDK initialization
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export const FROM_EMAIL = 'Street Candy\'s <onboarding@resend.dev>';
export const REPLY_TO = 'hola@streetcandys.shop';
