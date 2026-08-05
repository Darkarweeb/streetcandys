import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/aliados?country=CO|CR
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!country || !['CO', 'CR'].includes(country)) {
    return NextResponse.json({ exito: false, error: 'country must be CO or CR' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partner_logos')
    .select('id, name, logo_url, website_url, sort_order')
    .eq('country_code', country)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exito: true, datos: data ?? [] });
}
