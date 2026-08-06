/**
 * GET /api/partners - Public endpoint: returns active partners sorted by display_order
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('partner_logos')
      .select('id, name, logo_url, website_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, datos: data ?? [] });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
