import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover — PickAmGo',
  description: 'Browse products, services, and local shops around your campus with PickAmGo.',
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
