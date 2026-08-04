import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase?.from('blog_categories')?.select('*')?.eq('is_active', true)?.order('sort_order');

    if (error) throw error;

    return NextResponse?.json({ datos: data || [] });
  } catch (error) {
    console.error('[API /blog/categorias]', error);
    return NextResponse?.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}
