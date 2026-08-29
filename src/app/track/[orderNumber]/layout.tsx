import type { Metadata } from 'next'
import TrackOrderPage from './page'

type TrackOrderParams = { orderNumber: string }

export async function generateMetadata({ params }: { params: Promise<TrackOrderParams> }): Promise<Metadata> {
  const { orderNumber } = await params
  return {
    title: { absolute: `Track Order ${orderNumber} — PickAmGo` },
    description: `Track the status of your PickAmGo order #${orderNumber}. Get real-time delivery updates and tracking information.`,
    alternates: {
      canonical: `/track/${encodeURIComponent(orderNumber)}`,
    },
  }
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
