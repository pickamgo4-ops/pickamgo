import type { Metadata } from 'next'
import SignupPage from './page'

export const metadata: Metadata = {
  title: 'Sign Up — PickAmGo',
  description: 'Create a free PickAmGo account. Start discovering products, shops, and services, or open your own shop today.',
  alternates: {
    canonical: '/auth/signup',
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
