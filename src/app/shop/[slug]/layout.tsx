import type { Metadata } from 'next'

type ShopParams = { slug: string }

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pickamgo-production.up.railway.app/api'

export async function generateMetadata({ params }: { params: Promise<ShopParams> }): Promise<Metadata> {
  const { slug } = await params

  try {
    const response = await fetch(`${apiUrl}/shops/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    })
    const result = await response.json()
    const shop = result?.data

    if (shop?.name) {
      return {
        title: { absolute: `${shop.name} — PickAmGo` },
        description: shop.description || `Shop ${shop.name} on PickAmGo.`,
        alternates: {
          canonical: `/shop/${encodeURIComponent(slug)}`,
        },
        openGraph: {
          title: `${shop.name} — PickAmGo`,
          description: shop.description || `Shop ${shop.name} on PickAmGo.`,
          type: 'website',
          images: [{ url: shop.logo || '/og-image.png', alt: `${shop.name} logo` }],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${shop.name} — PickAmGo`,
          description: shop.description || `Shop ${shop.name} on PickAmGo.`,
          images: [shop.logo || '/og-image.png'],
        },
      }
    }
  } catch {
    // Use the shared site metadata when the shop API is unavailable.
  }

  return { title: { absolute: 'Shop — PickAmGo' } }
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
