'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { api } from '../lib/api'
import { useRole } from '../contexts/RoleContext'

export function AccountDeletionPanel() {
  const { clearAuth } = useRole()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') return
    setLoading(true)
    setError('')
    const response = await api.delete('/auth/me', { confirmation })
    if (response.success) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('pickamgo-pending-login')
      clearAuth()
      window.location.assign('/auth/login?deleted=1')
      return
    }
    setError(response.error || 'Unable to delete your account. Please try again.')
    setLoading(false)
  }

  return (
    <>
      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 flex-shrink-0 text-red-600" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Delete account</h3>
            <p className="mt-1 text-sm text-red-800/80">Permanently remove your account and personal information. This cannot be undone.</p>
            <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-100" onClick={() => { setOpen(true); setError('') }} icon={<Trash2 size={16} />}>
              Delete Account
            </Button>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-warm-900">Delete your account permanently?</h2>
            <p className="mt-3 text-sm leading-6 text-warm-800/75">Deleting your PickAmGo account will permanently remove your account and all personal information associated with it. This action cannot be undone.</p>
            <p className="mt-3 text-sm leading-6 text-warm-800/75">This may remove your profile, contact details, addresses, saved information, cart, messages, notifications, shop and products, rider data, preferences, and authentication credentials. Historical transaction records may be retained without your personal identity where required for accounting.</p>
            <p className="mt-4 font-semibold text-red-700">Once confirmed, your account cannot be recovered.</p>
            {error && <p className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
            <div className="mt-5">
              <label className="block text-sm font-medium text-warm-900">Type DELETE to permanently delete your account</label>
              <input value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-warm-200 px-4 py-3 text-warm-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200" autoComplete="off" />
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => { setOpen(false); setConfirmation('') }} disabled={loading}>Cancel</Button>
              <Button fullWidth className="bg-red-600 hover:bg-red-700" onClick={deleteAccount} disabled={loading || confirmation !== 'DELETE'}>{loading ? 'Deleting...' : 'Delete My Account'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
