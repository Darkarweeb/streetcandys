import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString());

    if (error) throw error;

    // Flatten and deduplicate tags
    const allTags = (data || []).flatMap((p: { tags: string[] }) => p.tags || []);
    const uniqueTags = [...new Set(allTags)].sort();

    return NextResponse.json({ datos: uniqueTags });
  } catch (error) {
    console.error('[API /blog/tags]', error);
    return NextResponse.json({ datos: [] });
  }
}
