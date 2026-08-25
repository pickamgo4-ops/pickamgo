'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, AlertTriangle, XCircle, Package, Plus, Search } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerInventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/inventory?limit=100')
      if (response.success && response.data) {
        setProducts(response.data.products || [])
      }
    } catch {
      setError('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleStockUpdate = async (productId: string, newStock: number) => {
    try {
      const response = await api.patch(`/products/${productId}`, { stock: newStock })
      if (response.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p))
      }
    } catch {
      setError('Failed to update stock')
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10)
  const outOfStock = products.filter(p => p.stock === 0)

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading inventory...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Inventory</h1>
          <p className="text-warm-800/60 mt-1">{products.length} products in inventory</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stock Alerts */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {lowStock.length > 0 && (
              <Card className="p-4 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={18} className="text-yellow-600" />
                  <span className="font-semibold text-yellow-700">Low Stock</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{lowStock.length}</p>
                <p className="text-xs text-yellow-700">≤ 10 items left</p>
              </Card>
            )}
            {outOfStock.length > 0 && (
              <Card className="p-4 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={18} className="text-red-600" />
                  <span className="font-semibold text-red-700">Out of Stock</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{outOfStock.length}</p>
                <p className="text-xs text-red-700">Need restocking</p>
              </Card>
            )}
          </div>
        )}

        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <Archive size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No products in inventory</h3>
            <p className="text-sm text-warm-800/60 mb-4">Add products to start managing inventory</p>
            <Button onClick={() => router.push('/seller/products/new')} icon={<Plus size={18} />}>
              Add Product
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-warm-200 flex-shrink-0">
                    <img
                      src={product.images?.[0]?.url || product.image || ''}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-warm-900 truncate">{product.name}</h4>
                    <p className="text-sm text-warm-800/60">{product.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-warm-800/60">Stock:</span>
                      <input
                        type="number"
                        min="0"
                        value={product.stock}
                        onChange={(e) => handleStockUpdate(product.id, parseInt(e.target.value) || 0)}
                        className={`w-20 px-3 py-1.5 rounded-lg border text-center text-sm font-medium ${
                          product.stock === 0 ? 'border-red-200 bg-red-50 text-red-700' :
                          product.stock <= 10 ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                          'border-warm-200 bg-white text-warm-900'
                        }`}
                      />
                    </div>
                    <Badge variant={
                      product.stock === 0 ? 'deal' :
                      product.stock <= 10 ? 'trending' :
                      product.status === 'ACTIVE' ? 'verified' : 'default'
                    }>
                      {product.stock === 0 ? 'Out of Stock' : product.stock <= 10 ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
