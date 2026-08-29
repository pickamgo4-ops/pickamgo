import type { Metadata } from 'next'

type ServiceParams = { id: string }

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pickamgo-production.up.railway.app/api'

export async function generateMetadata({ params }: { params: Promise<ServiceParams> }): Promise<Metadata> {
  const { id } = await params

  try {
    const response = await fetch(`${apiUrl}/services/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    })
    const result = await response.json()
    const service = result?.data
    const title = service?.name ? `${service.name} — PickAmGo` : 'Service — PickAmGo'
    const description = service?.description || 'Discover services on PickAmGo.'
    const image = service?.images?.[0]?.url || service?.image || '/og-image.png'

    return {
      title: { absolute: title },
      description,
      alternates: {
        canonical: `/service/${encodeURIComponent(id)}`,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        images: [{ url: image, alt: service?.name || 'PickAmGo service' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    }
  } catch {
    return { title: { absolute: 'Service — PickAmGo' } }
  }
}

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return children
}
