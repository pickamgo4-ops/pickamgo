'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Package, DollarSign, Tag, MapPin, FileText, Clock } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { api } from '../../lib/api'

export default function SellPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    type: 'product' as 'product' | 'service',
    name: '',
    price: '',
    description: '',
    categoryId: '',
    location: '',
    stock: '',
    duration: '',
    images: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const endpoint = formData.type === 'product' ? '/products' : '/services'
      const body: any = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        categoryId: formData.categoryId,
        location: formData.location,
      }

      if (formData.type === 'product') {
        body.stock = parseInt(formData.stock) || 0
      } else {
        body.duration = formData.duration
      }

      if (formData.images.length > 0) {
        body.images = formData.images.map(url => ({ url }))
      }

      const response = await api.post(endpoint, body)

      if (response.success) {
        setSuccess('Your listing has been created successfully!')
        setStep(3)
      } else {
        setError(response.error || response.message || 'Failed to create listing')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
          Sell something
        </h1>
        <p className="text-warm-800/60 mb-8">
          List your product or service and reach local customers
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-primary text-white' : 'bg-warm-200 text-warm-800/50'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 ${
                    step > s ? 'bg-primary' : 'bg-warm-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg text-warm-900 mb-4">
                What are you selling?
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'product' })}
                  className={`p-4 rounded-xl border-2 text-center transition-colors ${
                    formData.type === 'product'
                      ? 'border-primary bg-primary/5'
                      : 'border-warm-200 hover:border-primary/30'
                  }`}
                >
                  <Package size={24} className="mx-auto mb-2 text-primary" />
                  <span className="font-semibold text-warm-900">Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'service' })}
                  className={`p-4 rounded-xl border-2 text-center transition-colors ${
                    formData.type === 'service'
                      ? 'border-primary bg-primary/5'
                      : 'border-warm-200 hover:border-primary/30'
                  }`}
                >
                  <DollarSign size={24} className="mx-auto mb-2 text-warm-800/50" />
                  <span className="font-semibold text-warm-900">Service</span>
                </button>
              </div>

              <Input
                placeholder="Product or service name"
                value={formData.name}
                onValueChange={(v) => setFormData({ ...formData, name: v })}
                icon={<Tag size={20} />}
                required
              />

              <div className="relative">
                <Input
                  placeholder="Price (GH₵)"
                  type="number"
                  value={formData.price}
                  onValueChange={(v) => setFormData({ ...formData, price: v })}
                  icon={<DollarSign size={20} />}
                  required
                />
              </div>

              {formData.type === 'product' && (
                <Input
                  placeholder="Stock quantity"
                  type="number"
                  value={formData.stock}
                  onValueChange={(v) => setFormData({ ...formData, stock: v })}
                  icon={<Package size={20} />}
                />
              )}

              {formData.type === 'service' && (
                <Input
                  placeholder="Duration (e.g., 1 hour)"
                  value={formData.duration}
                  onValueChange={(v) => setFormData({ ...formData, duration: v })}
                  icon={<Clock size={20} />}
                />
              )}

              <div className="relative">
                <label className="block text-sm font-medium text-warm-900 mb-2">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3.5 px-4 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="beauty">💅 Beauty</option>
                  <option value="food">🍔 Food</option>
                  <option value="fashion">👕 Fashion</option>
                  <option value="electronics">📱 Electronics</option>
                  <option value="home">🏠 Home</option>
                  <option value="services">✨ Services</option>
                </select>
              </div>

              <Input
                placeholder="Location"
                value={formData.location}
                onValueChange={(v) => setFormData({ ...formData, location: v })}
                icon={<MapPin size={20} />}
                required
              />

              <Input
                placeholder="Description"
                value={formData.description}
                onValueChange={(v) => setFormData({ ...formData, description: v })}
                icon={<FileText size={20} />}
                required
              />

              <div className="border-2 border-dashed border-warm-200 rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
                <ImagePlus size={32} className="mx-auto mb-2 text-warm-800/40" />
                <p className="text-sm font-medium text-warm-900 mb-1">
                  Add photos
                </p>
                <p className="text-xs text-warm-800/50">
                  Drag and drop or click to upload
                </p>
              </div>

              <Button fullWidth onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-semibold text-lg text-warm-900 mb-4">
                Review & Publish
              </h2>

              <div className="bg-warm-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-warm-800/60">Type</span>
                  <span className="font-medium text-warm-900 capitalize">{formData.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-warm-800/60">Name</span>
                  <span className="font-medium text-warm-900">{formData.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-warm-800/60">Price</span>
                  <span className="font-medium text-warm-900">GH₵{formData.price}</span>
                </div>
                {formData.type === 'product' && formData.stock && (
                  <div className="flex justify-between text-sm">
                    <span className="text-warm-800/60">Stock</span>
                    <span className="font-medium text-warm-900">{formData.stock}</span>
                  </div>
                )}
                {formData.type === 'service' && formData.duration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-warm-800/60">Duration</span>
                    <span className="font-medium text-warm-900">{formData.duration}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-warm-800/60">Location</span>
                  <span className="font-medium text-warm-900">{formData.location}</span>
                </div>
              </div>

              <p className="text-sm text-warm-800/60">
                Your listing will be reviewed and published within 24 hours.
              </p>

              <div className="flex gap-3">
                <Button fullWidth type="submit" disabled={loading}>
                  {loading ? 'Publishing...' : 'Publish Listing'}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">
                {success ? 'Listing Published!' : 'Listing Published!'}
              </h2>
              <p className="text-warm-800/60 mb-6">
                Your listing is now live and visible to customers near you.
              </p>
              <Button fullWidth onClick={() => {
                setStep(1)
                setFormData({
                  type: 'product',
                  name: '',
                  price: '',
                  description: '',
                  categoryId: '',
                  location: '',
                  stock: '',
                  duration: '',
                  images: [],
                })
              }}>
                Create Another Listing
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
