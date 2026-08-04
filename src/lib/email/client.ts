/**
 * Street Candy's — Resend Email Client
 * Centralized Resend SDK initialization
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'your-resend-api-key-here') {
      throw new Error(
        'RESEND_API_KEY is not configured. Set a real Resend API key in your environment variables.',
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Production sender — requires streetcandys.shop to be a verified domain in Resend
export const FROM_EMAIL = "Street Candy's <CREW@streetcandys.shop>";
export const REPLY_TO = 'CREW@streetcandys.shop';
