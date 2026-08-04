import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*, blog_categories(name, slug), profiles(full_name, avatar_url)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
    }

    // Increment view count (fire and forget)
    supabase
      .from('blog_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id)
      .then(() => {});

    return NextResponse.json({ datos: post });
  } catch (error) {
    console.error('[API /blog/[slug]]', error);
    return NextResponse.json({ error: 'Error al obtener artículo' }, { status: 500 });
  }
}
