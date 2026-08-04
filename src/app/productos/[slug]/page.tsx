import type { Metadata } from 'next';
import ProductDetailPage from './client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
  const fallbackImage = `${baseUrl}/assets/images/og-image-streetcandys-premium.png`;

  try {
    const response = await fetch(`${baseUrl}/api/productos/${slug}`, {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    const product = data.datos;

    if (!product) {
      return {
        title: "Producto no encontrado | Street Candys",
        robots: { index: false },
      };
    }

    const title = `${product.name} | Street Candys`;
    const description =
      product.description?.substring(0, 160) ||
      `Compra ${product.name} en Street Candys. Premium hemp-derived products.`;

    // Ensure image URL is absolute
    let imageUrl = product.images?.[0]?.url || product.thumbnail_url;
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${baseUrl}${imageUrl}`;
    }
    const ogImage = imageUrl || fallbackImage;

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      keywords: [product.name, 'hemp', 'CBD', 'Street Candys', product.category_name].filter(Boolean),
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'es_CO',
        siteName: 'Street Candys',
        url: `${baseUrl}/productos/${slug}`,
        images: [{ url: ogImage, width: 1200, height: 630, alt: product.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        creator: '@streetcandys',
        images: [ogImage],
      },
      alternates: {
        canonical: `${baseUrl}/productos/${slug}`,
      },
    };
  } catch {
    return {
      title: "Producto | Street Candys",
      description: 'Explora nuestro catálogo de premium hemp-derived products.',
      openGraph: {
        title: 'Street Candys',
        description: 'Premium Hemp-Derived Products.',
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

export default ProductDetailPage;
