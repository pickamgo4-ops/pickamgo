'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Key, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await api.post('/auth/reset-password', { token, newPassword: password })
      if (response.success) {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login'), 3000)
      } else {
        setError(response.error || 'Failed to reset password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 text-center">
            <Link href="/">
              <img src="/logo.png" alt="PickAmGo logo" className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
            <Link href="/" className="block text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors mb-6">
              PickAmGo
            </Link>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-warm-800/60 mb-6">
              Your password has been reset. Redirecting to login...
            </p>
            <Link href="/auth/login">
              <Button fullWidth>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
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
            Choose a new password for your account
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onValueChange={setPassword}
              icon={<Key size={18} />}
              required
              minLength={6}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              icon={<Key size={18} />}
              required
              minLength={6}
            />
            <Button fullWidth type="submit" disabled={loading || !token}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 text-center">
            <Link href="/">
              <img src="/logo.png" alt="PickAmGo logo" className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
            <Link href="/" className="block text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors mb-6">
              PickAmGo
            </Link>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}