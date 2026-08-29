import type { Metadata } from 'next'
import ForgotPage from './page'

export const metadata: Metadata = {
  title: 'Reset Password — PickAmGo',
  description: 'Reset your PickAmGo account password. Enter your email to receive a secure password reset link.',
  alternates: {
    canonical: '/auth/forgot-password',
  },
}

export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
