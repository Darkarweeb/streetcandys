/**
 * POST /api/admin/partners/upload-logo
 * Upload a partner logo to Supabase Storage (partner-logos bucket)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ exito: false, error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { exito: false, error: 'Tipo de archivo no permitido. Use PNG, JPG, WebP o SVG.' },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { exito: false, error: 'El archivo supera el límite de 5MB' },
        { status: 400 },
      );
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `logos/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('partner-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ exito: false, error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('partner-logos')
      .getPublicUrl(filePath);

    return NextResponse.json(
      { exito: true, datos: { url: publicUrl, path: filePath } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
