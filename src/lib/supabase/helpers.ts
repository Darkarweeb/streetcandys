import { createClient } from './client';

/**
 * Verifies the Supabase connection by performing a lightweight health check.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 *
 * This helper is intentionally minimal — it only tests connectivity.
 * It does NOT create tables, authenticate users, or modify any data.
 */
export async function verifyConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Lightweight auth check — does not require any tables to exist
    const { error } = await supabase.auth.getSession();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    return { ok: false, error: message };
  }
}
