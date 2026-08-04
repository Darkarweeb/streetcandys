/**
 * DELETE /api/admin/productos/delete-image
 * Delete a product image from Supabase Storage
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
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

    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ exito: false, error: 'Path requerido' }, { status: 400 });
    }

    // Extract just the path within the bucket
    const bucketPath = path.includes('product-images/')
      ? path.split('product-images/')[1]
      : path;

    const { error } = await supabase.storage
      .from('product-images')
      .remove([bucketPath]);

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
