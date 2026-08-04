import type { Metadata } from 'next';
import BlogTagPage from './client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const decodedTag = decodeURIComponent(tag);

  const title = `#${decodedTag} | Blog Street Candy's`;
  const description = `Lee artículos etiquetados con "${decodedTag}" en el blog de Street Candy's.`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords: [decodedTag, 'cannabis', 'blog', "Street Candy's"],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_CO',
      siteName: "Street Candy's",
      url: `${baseUrl}/blog/tag/${tag}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      creator: '@streetcandys',
    },
    alternates: {
      canonical: `${baseUrl}/blog/tag/${tag}`,
    },
  };
}

export default BlogTagPage;
