import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/aliados/upload
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });

  const allowed = ['image/png', 'image/svg+xml', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten PNG, SVG y WebP' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from('partner-logos')
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = adminClient.storage
    .from('partner-logos')
    .getPublicUrl(fileName);

  return NextResponse.json({ exito: true, url: urlData.publicUrl });
}
