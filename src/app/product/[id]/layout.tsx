import type { Metadata } from 'next'

type ProductParams = { id: string }

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pickamgo-production.up.railway.app/api'

export async function generateMetadata({ params }: { params: Promise<ProductParams> }): Promise<Metadata> {
  const { id } = await params

  try {
    const response = await fetch(`${apiUrl}/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    })
    const result = await response.json()
    const product = result?.data
    const title = product?.name ? `${product.name} — PickAmGo` : 'Product — PickAmGo'
    const description = product?.description || 'Discover products on PickAmGo.'
    const image = product?.images?.[0]?.url || product?.image || '/og-image.png'

    return {
      title: { absolute: title },
      description,
      alternates: {
        canonical: `/product/${encodeURIComponent(id)}`,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        images: [{ url: image, alt: product?.name || 'PickAmGo product' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    }
  } catch {
    return { title: { absolute: 'Product — PickAmGo' } }
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children
}
