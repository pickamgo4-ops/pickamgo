import type { Metadata } from 'next'
import LoginPage from './page'

export const metadata: Metadata = {
  title: 'Login — PickAmGo',
  description: 'Log in to your PickAmGo account to continue shopping, track orders, and manage your marketplace activity.',
  alternates: {
    canonical: '/auth/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
