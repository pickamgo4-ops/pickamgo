import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover — PickAmGo',
  description: 'Browse products, services, and local shops on PickAmGo. Discover everything from beauty and food to sneakers, electronics, and more.',
  alternates: {
    canonical: '/discover',
  },
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
