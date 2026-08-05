import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdminOrStaff(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;
  return user;
}

// GET /api/admin/aliados?country=CO|CR
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdminOrStaff(supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  let query = supabase
    .from('partner_logos')
    .select('*')
    .order('sort_order', { ascending: true });

  if (country && ['CO', 'CR'].includes(country)) {
    query = query.eq('country_code', country);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ exito: true, datos: data ?? [] });
}

// POST /api/admin/aliados
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdminOrStaff(supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, logo_url, website_url, country_code, sort_order, is_active } = body;

  if (!name?.trim() || !logo_url?.trim() || !country_code) {
    return NextResponse.json({ error: 'name, logo_url y country_code son requeridos' }, { status: 400 });
  }
  if (!['CO', 'CR'].includes(country_code)) {
    return NextResponse.json({ error: 'country_code debe ser CO o CR' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('partner_logos')
    .insert({
      name: name.trim(),
      logo_url: logo_url.trim(),
      website_url: website_url?.trim() || null,
      country_code,
      sort_order: sort_order ?? 0,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exito: true, datos: data }, { status: 201 });
}
