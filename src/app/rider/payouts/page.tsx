'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

export default function RiderPayoutsPage() {
  const [balances, setBalances] = useState<{ available: number; pending: number; totalEarnings: number; totalWithdrawn: number } | null>(null)
  const [methods, setMethods] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [addingMethod, setAddingMethod] = useState(false)
  const [provider, setProvider] = useState('MTN')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [balancesRes, methodsRes, historyRes] = await Promise.all([
        api.get<any>('/payouts/balances'),
        api.get<any>('/payouts/methods'),
        api.get<any>('/payouts/history'),
      ])
      if (balancesRes.success) setBalances(balancesRes.data)
      if (methodsRes.success) setMethods(methodsRes.data)
      if (historyRes.success) setHistory(historyRes.data.payouts || [])
    } catch (error) {
      console.error('Failed to load payout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingMethod(true)
    setMessage(null)
    try {
      const response = await api.post('/payouts/methods', {
        type: 'mobile_money',
        provider,
        phoneNumber,
        accountName,
      })
      if (response.success) {
        setMessage({ type: 'success', text: 'Payout method added successfully' })
        setShowAddMethod(false)
        setProvider('MTN')
        setPhoneNumber('')
        setAccountName('')
        loadData()
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to add payout method' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add payout method' })
    } finally {
      setAddingMethod(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMethodId) {
      setMessage({ type: 'error', text: 'Please select a payout method' })
      return
    }
    setWithdrawing(true)
    setMessage(null)
    try {
      const response = await api.post('/payouts/withdraw', {
        amount: parseFloat(withdrawAmount),
        payoutMethodId: selectedMethodId,
      })
      if (response.success) {
        setMessage({ type: 'success', text: 'Withdrawal initiated successfully' })
        setShowWithdraw(false)
        setWithdrawAmount('')
        loadData()
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to process withdrawal' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process withdrawal' })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleDeleteMethod = async (id: string) => {
    try {
      const response = await api.delete(`/payouts/methods/${id}`)
      if (response.success) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to delete method:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle size={16} className="text-green-500" />
      case 'PROCESSING': return <Clock size={16} className="text-yellow-500" />
      case 'FAILED': return <XCircle size={16} className="text-red-500" />
      default: return <Clock size={16} className="text-warm-800/40" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading payouts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="font-display text-2xl font-bold text-warm-900 mb-6">Payouts</h1>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <p className="text-sm text-warm-800/60 mb-1">Available Earnings</p>
            <p className="text-2xl font-bold text-warm-900">GH₵{balances?.available?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <p className="text-sm text-warm-800/60 mb-1">Pending Earnings</p>
            <p className="text-2xl font-bold text-warm-900">GH₵{balances?.pending?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <p className="text-sm text-warm-800/60 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-warm-900">GH₵{balances?.totalEarnings?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <p className="text-sm text-warm-800/60 mb-1">Total Withdrawn</p>
            <p className="text-2xl font-bold text-warm-900">GH₵{balances?.totalWithdrawn?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-warm-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-warm-900">Payout Method</h2>
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setShowAddMethod(true)}>Add</Button>
          </div>
          {methods.length === 0 ? (
            <p className="text-sm text-warm-800/60">No payout method added yet</p>
          ) : (
            <div className="space-y-2">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                  <div>
                    <p className="font-medium text-warm-900">{method.provider} Mobile Money</p>
                    <p className="text-sm text-warm-800/60">{method.phoneNumber}</p>
                  </div>
                  <button onClick={() => handleDeleteMethod(method.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-warm-200 mb-6">
          <Button fullWidth onClick={() => setShowWithdraw(true)} disabled={!balances || balances.available < 20}>
            Withdraw Money
          </Button>
          {balances && balances.available < 20 && (
            <p className="text-xs text-warm-800/60 mt-2 text-center">Minimum withdrawal is GHS 20.00</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-warm-200">
          <h2 className="font-semibold text-warm-900 mb-3">Payout History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-warm-800/60">No payouts yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                  <div>
                    <p className="font-medium text-warm-900">GH₵{payout.amount.toFixed(2)}</p>
                    <p className="text-xs text-warm-800/60">{payout.payoutMethod?.provider} {payout.payoutMethod?.phoneNumber}</p>
                    <p className="text-xs text-warm-800/40">{new Date(payout.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(payout.status)}
                    <span className="text-xs font-medium">{payout.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-4">Withdraw Money</h2>
            {message && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1">Available Balance</label>
                <p className="text-lg font-bold text-warm-900">GH₵{balances?.available?.toFixed(2) || '0.00'}</p>
              </div>
              <Input label="Amount (GHS)" type="number" value={withdrawAmount} onValueChange={setWithdrawAmount} required min="20" max={balances?.available || 0} />
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-2">Payout Method</label>
                {methods.length === 0 ? (
                  <p className="text-sm text-red-500">No payout method. Please add one first.</p>
                ) : (
                  <div className="space-y-2">
                    {methods.map((method) => (
                      <label key={method.id} className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer">
                        <input type="radio" name="method" value={method.id} checked={selectedMethodId === method.id} onChange={(e) => setSelectedMethodId(e.target.value)} />
                        <span className="font-medium">{method.provider}</span>
                        <span className="text-sm text-warm-800/60">{method.phoneNumber}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" fullWidth onClick={() => setShowWithdraw(false)}>Cancel</Button>
                <Button type="submit" fullWidth disabled={withdrawing || !selectedMethodId}>
                  {withdrawing ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMethod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-4">Add Payout Method</h2>
            {message && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleAddMethod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-2">Network</label>
                <div className="flex gap-2">
                  {['MTN', 'VODAFONE', 'AIRTELTIGO'].map((net) => (
                    <button key={net} type="button" onClick={() => setProvider(net)} className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium ${provider === net ? 'border-primary bg-primary/5 text-primary' : 'border-warm-200 text-warm-800'}`}>
                      {net}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Phone Number" value={phoneNumber} onValueChange={setPhoneNumber} required />
              <Input label="Account Name (optional)" value={accountName} onValueChange={setAccountName} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" fullWidth onClick={() => setShowAddMethod(false)}>Cancel</Button>
                <Button type="submit" fullWidth disabled={addingMethod}>
                  {addingMethod ? 'Adding...' : 'Add Method'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
