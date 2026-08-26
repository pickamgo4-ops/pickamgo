'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Phone, User, Store, Bike } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'
import { useRole } from '@/contexts/RoleContext'

type UserRole = 'buyer' | 'seller' | 'rider'

export default function SignupPage() {
  const router = useRouter()
  const { setUser } = useRole()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('buyer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false)
  const [googleUser, setGoogleUser] = useState<{ email: string; name: string; avatar: string } | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer')
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (typeof window === 'undefined') return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        initializeGoogleSignIn()
      }
    }

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const initializeGoogleSignIn = () => {
    const google = (window as any).google
    if (!google?.accounts?.id) return
    if (!googleClientId) {
      setError('Google Sign-In is not configured. Please use email and password or contact support.')
      return
    }

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    const buttonContainer = document.getElementById('googleSignInButton')
    if (buttonContainer) {
      google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
      })
    }
  }

  const handleGoogleCredentialResponse = async (response: any) => {
    setGoogleLoading(true)
    setError('')
    try {
      const idToken = response?.credential
      if (!idToken) {
        setError('Google authentication was cancelled or failed.')
        return
      }

      const authResponse = await api.post<{ isNewUser?: boolean; email?: string; name?: string; avatar?: string; user?: any; token?: string }>('/auth/google', {
        idToken,
      })

      if (authResponse.success && authResponse.data) {
        if (authResponse.data.isNewUser) {
          setGoogleUser({
            email: authResponse.data.email || '',
            name: authResponse.data.name || '',
            avatar: authResponse.data.avatar || '',
          })
          setSelectedRole('buyer')
          setShowGoogleRoleModal(true)
        } else if (authResponse.data.token && authResponse.data.user) {
          completeGoogleSignIn(authResponse.data)
        } else {
          setError('Google authentication returned an invalid response.')
        }
      } else {
        setError(authResponse.error || 'Google authentication failed.')
      }
    } catch {
      setError('An error occurred during Google authentication.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const completeGoogleSignIn = (data: { user?: any; token?: string }) => {
    if (!data.user || !data.token) {
      setError('Google authentication returned an invalid response.')
      return
    }

    const u = data.user
    const normalizedRole = u.isAdmin ? 'admin' : u.isRider ? 'rider' : u.isSeller ? 'seller' : 'buyer'
    const normalizedUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      location: u.location,
      role: normalizedRole as 'buyer' | 'seller' | 'rider' | 'admin',
      isSeller: u.isSeller || false,
      isRider: u.isRider || false,
      isAdmin: u.isAdmin || false,
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
    window.dispatchEvent(new Event('auth-changed'))
    router.push(normalizedRole === 'seller' ? '/seller' : normalizedRole === 'rider' ? '/rider' : '/')
  }

  const handleGoogleComplete = async () => {
    if (!googleUser) return
    setLoading(true)
    setError('')
    try {
      const response = await api.post<{ user: any; token: string }>('/auth/google/complete', {
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
        role: selectedRole,
      })

      if (response.success && response.data) {
        completeGoogleSignIn(response.data)
      } else {
        setError(response.error || 'Failed to complete Google registration.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
      setShowGoogleRoleModal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post<{ token: string; user: any }>('/auth/register', {
        name,
        email,
        phone,
        password,
        role,
      })

      if (response.success && response.data) {
        const u = response.data.user
        const normalizedRole = u.isAdmin ? 'admin' : u.isRider ? 'rider' : u.isSeller ? 'seller' : 'buyer'
        const normalizedUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          location: u.location,
          role: normalizedRole as 'buyer' | 'seller' | 'rider' | 'admin',
          isSeller: u.isSeller || false,
          isRider: u.isRider || false,
          isAdmin: u.isAdmin || false,
        }

        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(normalizedUser))
        setUser(normalizedUser)
        window.dispatchEvent(new Event('auth-changed'))
        router.push(normalizedRole === 'seller' ? '/seller' : normalizedRole === 'rider' ? '/rider' : '/')
      } else {
        setError(response.error || response.message || 'Registration failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = [
    { value: 'buyer' as UserRole, label: 'Buyer', description: 'Shop and discover products', icon: User },
    { value: 'seller' as UserRole, label: 'Seller', description: 'Sell products and services', icon: Store },
    { value: 'rider' as UserRole, label: 'Rider', description: 'Deliver orders and earn', icon: Bike },
  ]

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
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">
            Create account
          </h1>
          <p className="text-warm-800/60">
            Join PickAmGo and discover local gems
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
              type="text"
              placeholder="Full name"
              value={name}
              onValueChange={setName}
              icon={<User size={20} />}
              required
            />

            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onValueChange={setEmail}
              icon={<Mail size={20} />}
              required
            />

            <Input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onValueChange={setPhone}
              icon={<Phone size={20} />}
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-warm-900">I want to</label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = role === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <Icon size={20} className={`mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-warm-800/50'}`} />
                      <span className="text-xs font-medium text-warm-900 block">{option.label}</span>
                      <span className="text-[10px] text-warm-800/60 hidden md:block">{option.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-warm-200 text-primary focus:ring-primary" required />
              <span className="text-sm text-warm-800/70">
                I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <Button fullWidth type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
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

            <div className="mt-4">
              {googleClientId ? (
                <div id="googleSignInButton" className="w-full" />
              ) : (
                <p className="text-center text-sm text-warm-800/60">Google Sign-Up is currently unavailable.</p>
              )}
              {googleLoading && (
                <div className="mt-2 text-center text-sm text-warm-800/60">Connecting to Google...</div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-warm-800/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:text-primary-dark font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {showGoogleRoleModal && googleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
            <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">Complete your registration</h2>
            <p className="text-warm-800/60 mb-6">Choose how you want to use PickAmGo.</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {roleOptions.map((option) => {
                const Icon = option.icon
                const isSelected = selectedRole === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedRole(option.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary/10 text-primary' : 'bg-warm-100 text-warm-800/50'}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-warm-900">{option.label}</p>
                      <p className="text-xs text-warm-800/60">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button fullWidth type="button" onClick={handleGoogleComplete} disabled={loading}>
                {loading ? 'Creating account...' : 'Continue'}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => { setShowGoogleRoleModal(false); setGoogleUser(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
