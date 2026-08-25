'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Phone, User, Store, Bike } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

type UserRole = 'buyer' | 'seller' | 'rider'

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('buyer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        window.dispatchEvent(new Event('auth-changed'))
        router.push('/')
      } else {
        setError(response.error || response.message || 'Registration failed')
      }
    } catch (err) {
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
          <img src="/logo.png" alt="PickAmGo logo" className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20 mx-auto mb-4" />
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

          <p className="mt-6 text-center text-sm text-warm-800/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:text-primary-dark font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
