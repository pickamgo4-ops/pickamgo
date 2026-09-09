'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const reasons = [
  ['SCAM_FRAUD', 'Scam or fraud'],
  ['COUNTERFEIT', 'Counterfeit product'],
  ['PROHIBITED_ITEM', 'Prohibited item'],
  ['MISLEADING_INFORMATION', 'Misleading information'],
  ['INCORRECT_CATEGORY', 'Incorrect category'],
  ['INAPPROPRIATE_CONTENT', 'Inappropriate content'],
  ['OTHER', 'Other'],
]

export function ProductReportModal({ productId, onClose, onSubmit }: { productId: string; onClose: () => void; onSubmit: (data: { category: string; reason: string; description?: string }) => Promise<{ success: boolean; error?: string }> }) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!category) return setError('Select a reason')
    setSaving(true)
    const result = await onSubmit({ category, reason: reasons.find(([value]) => value === category)?.[1] || category, description: description.trim() || undefined })
    if (result.success) onClose()
    else setError(result.error || 'Could not submit report')
    setSaving(false)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-warm-900">Report product</h2><button type="button" aria-label="Close report" onClick={onClose}><X size={20} /></button></div><p className="mb-4 text-sm text-warm-800/60">Reports are reviewed by PickAmGo. Do not include personal contact information.</p>{error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}<select value={category} onChange={event => setCategory(event.target.value)} className="mb-3 w-full rounded-xl border border-warm-200 bg-white px-3 py-3 text-sm"><option value="">Choose a reason</option>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} placeholder="Additional details (optional)" className="mb-4 w-full resize-none rounded-xl border border-warm-200 p-3 text-sm" /><div className="flex gap-3"><Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button><Button type="submit" fullWidth loading={saving} icon={<Send size={16} />}>Submit report</Button></div></form></div>
}
