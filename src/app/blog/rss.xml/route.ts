import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const supabase = await createClient();

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, published_at, tags, profiles(full_name)')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(20);

    const items = (posts || [])
      .map((post: {
        title: string;
        slug: string;
        excerpt: string | null;
        published_at: string | null;
        tags: string[];
        profiles?: { full_name: string } | null;
      }) => {
        const pubDate = post.published_at
          ? new Date(post.published_at).toUTCString()
          : new Date().toUTCString();
        const description = post.excerpt
          ? post.excerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          : '';
        const title = post.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const categories = (post.tags || [])
          .map((t: string) => `<category>${t.replace(/&/g, '&amp;')}</category>`)
          .join('');

        return `
    <item>
      <title>${title}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      ${post.profiles?.full_name ? `<author>${post.profiles.full_name.replace(/&/g, '&amp;')}</author>` : ''}
      ${categories}
    </item>`;
      })
      .join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog de Street Candy's</title>
    <link>${baseUrl}/blog</link>
    <description>Artículos sobre cannabis, bienestar, ciencia y cultura de Street Candy's.</description>
    <language>es-co</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[RSS Feed]', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}
