import type { Metadata } from 'next';
import BlogCategoryPage from './client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/blog/categorias/${slug}`, {
      cache: 'revalidate',
    });
    const data = await response.json();
    const category = data.datos;

    if (!category) {
      return {
        title: 'Categoría no encontrada | Street Candy\'s',
        robots: { index: false },
      };
    }

    const title = category.meta_title || `${category.name} | Blog Street Candy's`;
    const description = category.meta_description || category.description || `Lee artículos sobre ${category.name} en Street Candy's.`;

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      keywords: [category.name, 'cannabis', 'blog'],
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'es_CO',
        siteName: "Street Candy's",
        url: `${baseUrl}/blog/categoria/${slug}`,
      },
      twitter: {
        card: 'summary',
        title,
        description,
        creator: '@streetcandys',
      },
      alternates: {
        canonical: `${baseUrl}/blog/categoria/${slug}`,
      },
    };
  } catch (error) {
    return {
      title: 'Categoría | Street Candy\'s',
      description: 'Lee artículos sobre cannabis en el blog de Street Candy\'s.',
      robots: { index: false },
    };
  }
}

export default BlogCategoryPage;
