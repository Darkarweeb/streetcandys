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

    // Get the current post
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id, blog_category_id, tags')
      .eq('slug', slug)
      .single();

    if (!post) {
      return NextResponse.json({ datos: [] });
    }

    // Find related posts by same category or overlapping tags
    let query = supabase
      .from('blog_posts')
      .select('*, blog_categories(name, slug), profiles(full_name)')
      .eq('status', 'published')
      .neq('id', post.id)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(3);

    if (post.blog_category_id) {
      query = query.eq('blog_category_id', post.blog_category_id);
    } else if (post.tags && post.tags.length > 0) {
      query = query.overlaps('tags', post.tags);
    }

    const { data, error } = await query;
    if (error) throw error;

    // If not enough related posts, fill with recent posts
    let related = data || [];
    if (related.length < 3) {
      const { data: recent } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(name, slug), profiles(full_name)')
        .eq('status', 'published')
        .neq('id', post.id)
        .lte('published_at', new Date().toISOString())
        .not('id', 'in', `(${related.map(r => `'${r.id}'`).join(',') || "''"})`)
        .order('published_at', { ascending: false })
        .limit(3 - related.length);

      related = [...related, ...(recent || [])];
    }

    return NextResponse.json({ datos: related.slice(0, 3) });
  } catch (error) {
    console.error('[API /blog/[slug]/relacionados]', error);
    return NextResponse.json({ datos: [] });
  }
}
