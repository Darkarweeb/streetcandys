import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

// PATCH /api/admin/aliados/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireAdminOrStaff(supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const allowed = ['name', 'logo_url', 'website_url', 'country_code', 'sort_order', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (updates.country_code && !['CO', 'CR'].includes(updates.country_code as string)) {
    return NextResponse.json({ error: 'country_code debe ser CO o CR' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('partner_logos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exito: true, datos: data });
}

// DELETE /api/admin/aliados/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireAdminOrStaff(supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Get logo_url to delete from storage
  const { data: logo } = await supabase
    .from('partner_logos')
    .select('logo_url')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('partner_logos')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attempt to delete from storage (best-effort)
  if (logo?.logo_url) {
    try {
      const adminClient = createAdminClient();
      const url = new URL(logo.logo_url);
      const pathParts = url.pathname.split('/partner-logos/');
      if (pathParts.length > 1) {
        await adminClient.storage.from('partner-logos').remove([pathParts[1]]);
      }
    } catch { /* silent */ }
  }

  return NextResponse.json({ exito: true });
}
