'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/forgot-password', { email })
      if (response.success || response.error?.includes('If an account exists')) {
        setSent(true)
      } else {
        setError(response.error || 'Failed to send reset link')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo.png" alt="PickAmGo logo" className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
          <Link href="/" className="block text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors">
            PickAmGo
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-warm-800/60 hover:text-warm-900 mb-6">
            <ArrowLeft size={18} />
            Back to login
          </Link>
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">
            Reset password
          </h1>
          <p className="text-warm-800/60">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onValueChange={setEmail}
                icon={<Mail size={20} />}
                required
              />
              <Button fullWidth type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
                Check your email
              </h2>
              <p className="text-warm-800/60 mb-6">
                We sent a password reset link to {email}
              </p>
              <Link href="/auth/login">
                <Button fullWidth>Back to Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
