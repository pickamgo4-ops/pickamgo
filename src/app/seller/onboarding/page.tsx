'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Upload, MapPin, Settings, Package, FileText, CheckCircle, ArrowRight } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'

export default function SellerOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<any[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 7 })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadOnboarding()
  }, [])

  const loadOnboarding = async () => {
    try {
      const response = await api.get<any>('/seller/onboarding')
      if (response.success && response.data) {
        setChecks(response.data.checks || [])
        setProgress(response.data.progress || { completed: 0, total: 7 })
      }
    } catch (err) {
      console.error('Failed to load onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (check: any) => {
    if (check.done) return

    setActionLoading(check.key)
    try {
      if (check.key === 'shop') {
        router.push('/seller/shop/create')
      } else if (check.key === 'photo' || check.key === 'location' || check.key === 'delivery') {
        router.push('/seller/shop/settings')
      } else if (check.key === 'category') {
        router.push('/seller/categories/new')
      } else if (check.key === 'product') {
        router.push('/seller/products/new')
      } else if (check.key === 'verification') {
        router.push('/seller/verification')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (check: any) => {
    if (check.done) {
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Completed</span>
    }
    if (check.status === 'PENDING') {
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
    }
    if (check.status === 'REJECTED') {
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">Needs attention</span>
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading setup...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Get Started
            </h1>
            <p className="text-warm-800/60 mt-1">
              {progress.completed} of {progress.total} completed
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">
              {Math.round((progress.completed / progress.total) * 100)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-warm-200 rounded-full h-3 mb-8">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.key}
                className="flex items-center justify-between p-4 rounded-xl bg-warm-50"
              >
                <div className="flex items-center gap-3">
                  {check.done ? (
                    <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-warm-800/20 flex-shrink-0" />
                  )}
                  <div>
                    <span className={`text-sm ${check.done ? 'text-warm-800/50 line-through' : 'text-warm-900 font-medium'}`}>
                      {check.label}
                    </span>
                    {getStatusBadge(check)}
                  </div>
                </div>
                {!check.done && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(check)}
                    disabled={actionLoading === check.key}
                    icon={actionLoading === check.key ? undefined : <ArrowRight size={16} />}
                  >
                    {actionLoading === check.key ? 'Loading...' : 'Do it'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {progress.completed === progress.total && (
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              You're all set!
            </h2>
            <p className="text-warm-800/60 mb-4">
              Your shop is ready to start receiving orders.
            </p>
            <Button onClick={() => router.push('/seller')}>
              Go to Dashboard
            </Button>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
