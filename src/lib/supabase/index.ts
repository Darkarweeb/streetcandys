/**
 * Street Candy — Supabase Infrastructure
 *
 * Import clients directly from their specific files to avoid bundling issues:
 *
 * Usage:
 *   Client Components  → import { createClient } from '@/lib/supabase/client';
 *   Server Components  → import { createClient } from '@/lib/supabase/server';
 *   Admin (server only) → import { createAdminClient } from '@/lib/supabase/admin';
 *   Connection check   → import { verifyConnection } from '@/lib/supabase/helpers';
 */

export { verifyConnection } from './helpers';
