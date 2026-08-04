import type { Metadata } from 'next';
import BlogPostPage from './client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
  const fallbackImage = `${baseUrl}/assets/images/og-image-streetcandys-premium.png`;

  try {
    const response = await fetch(`${baseUrl}/api/blog/${slug}`, {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    const post = data.datos;

    if (!post) {
      return {
        title: "Artículo no encontrado | Street Candys",
        robots: { index: false },
      };
    }

    const title = post.meta_title || `${post.title} | Street Candys`;
    const description =
      post.meta_description ||
      post.excerpt?.substring(0, 160) ||
      `Lee ${post.title} en el blog de Street Candys.`;

    // Ensure image URL is absolute
    let imageUrl = post.cover_image_url;
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${baseUrl}${imageUrl}`;
    }
    const ogImage = imageUrl || fallbackImage;

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      keywords: [post.title, 'hemp', 'CBD', 'Street Candys', ...(post.tags || [])].filter(Boolean),
      openGraph: {
        title,
        description,
        type: 'article',
        locale: 'es_CO',
        siteName: 'Street Candys',
        url: `${baseUrl}/blog/${slug}`,
        images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
        publishedTime: post.published_at,
        authors: post.profiles?.full_name ? [post.profiles.full_name] : [],
        tags: post.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        creator: '@streetcandys',
        images: [ogImage],
      },
      alternates: {
        canonical: `${baseUrl}/blog/${slug}`,
      },
    };
  } catch {
    return {
      title: "Artículo | Street Candys",
      description: "Lee artículos sobre hemp y CBD en el blog de Street Candys.",
      openGraph: {
        title: "Street Candys Blog",
        description: "Lee artículos sobre hemp y CBD en el blog de Street Candys.",
        images: [{ url: fallbackImage, width: 1200, height: 630, alt: 'Street Candys — Premium Hemp-Derived Products' }],
      },
      twitter: {
        card: 'summary_large_image',
        images: [fallbackImage],
      },
      robots: { index: false },
    };
  }
}

export default BlogPostPage;
