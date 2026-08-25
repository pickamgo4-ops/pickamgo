'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'

export default function TrackPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (orderNumber.trim()) {
      router.push(`/track/${encodeURIComponent(orderNumber.trim())}`)
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <Search size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Track Order
            </h1>
            <p className="text-warm-800/60">Enter your order number</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-primary" />
          </div>
          <h3 className="font-semibold text-warm-900 text-center mb-2">Track Your Order</h3>
          <p className="text-sm text-warm-800/60 text-center mb-6">
            Enter your order number to see real-time delivery updates.
          </p>

          <form onSubmit={handleSubmit}>
            <Input
              placeholder="Enter order number (e.g., #FIN-12345)"
              value={orderNumber}
              onValueChange={setOrderNumber}
              icon={<Search size={20} />}
              className="mb-4"
            />
            <Button
              fullWidth
              type="submit"
              disabled={!orderNumber.trim()}
            >
              Track Order
            </Button>
          </form>
        </Card>

        <Card className="p-6 mt-6">
          <h4 className="font-semibold text-warm-900 mb-3">Where to find your order number?</h4>
          <ul className="space-y-2 text-sm text-warm-800/70">
            <li>Check your order confirmation email</li>
            <li>Look in your order history under "My Orders"</li>
            <li>The order number starts with #FIN-</li>
          </ul>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
