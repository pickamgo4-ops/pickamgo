import type { Metadata } from 'next'
import HelpPage from './page'

export const metadata: Metadata = {
  title: 'Help Center — PickAmGo',
  description: 'Get help with PickAmGo. Find answers about accounts, orders, payments, shops, and how to buy or sell on our marketplace.',
  alternates: {
    canonical: '/help',
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
