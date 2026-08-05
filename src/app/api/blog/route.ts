import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get('pagina') || '1', 10);
  const porPagina = Math.min(parseInt(searchParams.get('por_pagina') || '9', 10), 50);
  const categoria = searchParams.get('categoria') || '';
  const tag = searchParams.get('tag') || '';
  const busqueda = searchParams.get('q') || '';
  const destacado = searchParams.get('destacado') === 'true';

  try {
    const supabase = await createClient();

    // Auto-publish any scheduled posts whose time has come
    await supabase.rpc('publish_scheduled_posts').then(() => {});

    let query = supabase
      .from('blog_posts')
      .select('*, blog_categories(name, slug), profiles(full_name, avatar_url)', { count: 'exact' })
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (categoria) {
      const { data: cat } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', categoria)
        .single();
      if (cat) query = query.eq('blog_category_id', cat.id);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (busqueda.trim()) {
      query = query.or(`title.ilike.%${busqueda}%,excerpt.ilike.%${busqueda}%`);
    }

    if (destacado) {
      query = query.eq('is_featured', true).limit(1);
    } else {
      const from = (pagina - 1) * porPagina;
      query = query.range(from, from + porPagina - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ datos: data || [], total: count || 0, pagina, porPagina });
  } catch (error) {
    console.error('[API /blog]', error);
    return NextResponse.json({ error: 'Error al obtener artículos' }, { status: 500 });
  }
}
