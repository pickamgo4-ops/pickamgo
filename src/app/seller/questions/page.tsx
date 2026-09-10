'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function SellerQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.getSellerQuestions().then(response => {
      if (response.success) setQuestions(response.data || [])
      else setError(response.error || 'Unable to load questions.')
    }).catch(() => setError('Something went wrong. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const answer = async (id: string) => {
    const text = answers[id]?.trim()
    if (!text) return
    setSaving(id)
    setError('')
    setSuccess('')
    const response = await api.answerProductQuestion(id, text)
    if (response.success) {
      setQuestions(current => current.map(question => question.id === id ? { ...question, answer: text, answeredAt: response.data?.answeredAt } : question))
      setAnswers(current => ({ ...current, [id]: '' }))
      setSuccess('Answer saved.')
    } else setError(response.error || 'Unable to save answer.')
    setSaving(null)
  }

  return (
    <SellerSidebar>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Questions &amp; Answers</h1>
          <p className="mt-1 text-warm-800/60">Answer buyer questions about your products.</p>
        </div>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{success}</p>}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : questions.length === 0 ? (
          <Card className="p-12 text-center"><MessageSquare size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">No product questions yet.</p></Card>
        ) : (
          <div className="space-y-4">
            {questions.map(question => (
              <Card key={question.id} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{question.product?.name}</p>
                <p className="mt-2 font-medium text-warm-900">{question.question}</p>
                <p className="mt-1 text-xs text-warm-800/50">{new Date(question.createdAt).toLocaleString()}</p>
                {question.answer ? <p className="mt-4 border-l-2 border-primary pl-3 text-sm text-warm-800/70"><span className="font-semibold text-warm-900">Your response:</span> {question.answer}</p> : (
                  <div className="mt-4 space-y-2">
                    <label htmlFor={`answer-${question.id}`} className="sr-only">Answer this question</label>
                    <textarea id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} maxLength={1000} rows={3} placeholder="Write a helpful response" className="w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-primary" />
                    <div className="flex justify-end"><Button size="sm" onClick={() => answer(question.id)} disabled={saving === question.id || (answers[question.id] || '').trim().length === 0}>{saving === question.id ? 'Saving...' : 'Post answer'}</Button></div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
