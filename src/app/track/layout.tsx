import type { Metadata } from 'next'
import TrackPage from './page'

export const metadata: Metadata = {
  title: 'Track Order — PickAmGo',
  description: 'Track your PickAmGo order status in real time. Enter your order number to see delivery updates and location.',
  alternates: {
    canonical: '/track',
  },
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
