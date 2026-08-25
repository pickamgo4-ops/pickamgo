'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post<{ token: string; user: any }>('/auth/login', {
        email,
        password,
      })

      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        window.dispatchEvent(new Event('auth-changed'))
        const user = response.data.user
        router.push(user.isAdmin ? '/admin' : user.isRider ? '/rider' : user.isSeller ? '/seller' : '/')
      } else {
        setError(response.error || response.message || 'Login failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Find It Near Me logo" className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">
            Welcome back
          </h1>
          <p className="text-warm-800/60">
            Sign in to your Find It Near Me account
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onValueChange={setEmail}
              icon={<Mail size={20} />}
              required
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onValueChange={setPassword}
              icon={<Lock size={20} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-warm-800/40 hover:text-warm-800"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-warm-200 text-primary focus:ring-primary" />
                <span className="text-warm-800/70">Remember me</span>
              </label>
              <Link href="/auth/forgot" className="text-primary hover:text-primary-dark font-medium">
                Forgot password?
              </Link>
            </div>

            <Button fullWidth type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-warm-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-warm-800/50">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" fullWidth>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.03 2.53-2.18 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l2.85 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button variant="outline" fullWidth>
                <Phone size={20} className="mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-warm-800/60">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:text-primary-dark font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
