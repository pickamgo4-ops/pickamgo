'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, ExternalLink, Printer, QrCode, RefreshCw } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

export default function SellerQrCodePage() {
  const [qr, setQr] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const load = async () => { setLoading(true); const response = await api.getSellerQr(); if (response.success) setQr(response.data); else setError(response.error || 'Failed to load shop QR code'); setLoading(false) }
  useEffect(() => { load() }, [])
  const generate = async () => { setError(''); const response = await api.generateSellerQr(); if (response.success) setQr(response.data); else setError(response.error || 'Failed to generate shop QR code') }
  const copy = async () => { if (!qr?.url) return; await navigator.clipboard.writeText(qr.url); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  const qrImageUrl = qr?.url ? `https://quickchart.io/qr?size=800&margin=2&text=${encodeURIComponent(qr.url)}` : ''
  const download = () => { if (!qrImageUrl) return; const link = document.createElement('a'); link.href = qrImageUrl; link.download = 'pickamgo-shop-qr.png'; link.target = '_blank'; link.rel = 'noreferrer'; link.click() }
  const print = () => { if (!qrImageUrl) return; const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=600,height=700'); if (!printWindow) return; printWindow.document.write(`<html><head><title>PickAmGo Shop QR Code</title></head><body style="font-family:sans-serif;text-align:center;padding:32px"><h1>PickAmGo</h1><img src="${qrImageUrl}" alt="Shop QR code" style="width:420px;max-width:90vw"/><p>${qr.url}</p><script>window.onload=()=>{window.print();window.close()}</script></body></html>`); printWindow.document.close() }
  return <SellerSidebar><div className="mx-auto max-w-3xl space-y-6"><div><h1 className="font-display text-2xl font-bold text-warm-900">Shop QR Code</h1><p className="text-sm text-warm-800/60">Share a stable link to your public PickAmGo shop on posters, packaging, receipts, and social media.</p></div>{error && <Card className="border-red-200 bg-red-50 p-4"><div className="flex items-center justify-between gap-3 text-sm text-red-700"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div></Card>}<Card className="p-6"><div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-center"><div className="flex justify-center"><div className="flex h-52 w-52 items-center justify-center rounded-2xl border border-warm-200 bg-white p-3">{qrImageUrl ? <img src={qrImageUrl} alt="Shop QR code" className="h-full w-full" /> : <QrCode size={100} className="text-warm-800/30" />}</div></div><div className="space-y-4"><h2 className="font-display text-xl font-bold text-warm-900">Your store link</h2>{loading ? <p className="text-sm text-warm-800/60">Loading...</p> : qr?.url ? <><div className="rounded-xl bg-warm-50 p-3 break-all text-sm text-warm-800">{qr.url}</div><div className="flex flex-wrap gap-2"><Button onClick={copy} icon={<Copy size={16} />}>{copied ? 'Copied' : 'Copy link'}</Button><Button variant="outline" onClick={download} icon={<Download size={16} />}>Download PNG</Button><Button variant="outline" onClick={print} icon={<Printer size={16} />}>Print</Button><Button variant="outline" onClick={() => window.open(qr.url, '_blank')} icon={<ExternalLink size={16} />}>Open shop</Button><Button variant="outline" onClick={generate} icon={<RefreshCw size={16} />}>Regenerate link</Button></div><p className="text-xs text-warm-800/60">Scans recorded: {qr.scanCount || 0}. The QR points to a stable store token, so future shop slug changes can remain redirectable.</p></> : <Button onClick={generate}>Generate QR link</Button>}</div></div></Card></div></SellerSidebar>
}
