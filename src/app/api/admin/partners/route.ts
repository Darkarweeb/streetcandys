/**
 * GET  /api/admin/partners       - List all partners (admin)
 * POST /api/admin/partners       - Create a new partner (admin)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!perfil || !['admin', 'staff'].includes(perfil.role)) return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('partner_logos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, datos: data });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, logo_url, website_url, display_order, is_active } = body;

    if (!name || !logo_url) {
      return NextResponse.json(
        { exito: false, error: 'Nombre y logo son requeridos' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('partner_logos')
      .insert({
        name,
        logo_url,
        website_url: website_url || null,
        sort_order: display_order ?? 0,
        is_active: is_active ?? true,
        country_code: 'CO',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, datos: data }, { status: 201 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
