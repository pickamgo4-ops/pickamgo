'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, Check, CheckCircle2, Clock3, Eye, Plus, Scissors, Settings2, Sparkles, Users, X } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Service { id: string; name: string; description?: string; price: number; duration: string; status: string; staffRequired?: boolean }
interface Schedule { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean; isDayOff: boolean }
interface Staff { id: string; name: string; role: string; avatar?: string; isActive: boolean; availabilities?: Schedule[] }
interface Rules { autoConfirm: boolean; minBookingNoticeHours: number; maxAdvanceBookingDays: number; cancellationHours: number; bufferTimeMinutes: number; allowStaffSelection: boolean }
interface BookingStatus { status: 'NOT_CONFIGURED' | 'ALMOST_READY' | 'READY' | 'LIVE'; enabled: boolean; configured: boolean; checks: { services: boolean; staff: boolean; availability: boolean; rules: boolean; preview: boolean }; missing: string[] }

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function BookingSetupDashboardPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [rules, setRules] = useState<Rules | null>(null)
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setError('')
      const [servicesRes, staffRes, rulesRes] = await Promise.all([
        api.get<{ services: Service[] }>('/services?limit=100'),
        api.get<Staff[]>('/booking-setup/staff'),
        api.get<Rules>('/booking-setup/rules'),
      ])
      const statusRes = await api.get<BookingStatus>('/booking-setup/status')
      if (servicesRes.success && servicesRes.data) setServices(servicesRes.data.services || [])
      if (rulesRes.success && rulesRes.data) setRules(rulesRes.data)
      if (statusRes.success && statusRes.data) setBookingStatus(statusRes.data)
      if (!servicesRes.success || !staffRes.success || !rulesRes.success || !statusRes.success) setError('We could not load the latest booking configuration.')
      const loadedStaff = staffRes.data || []
      if (staffRes.success) {
        const schedules = await Promise.all(loadedStaff.map(member => api.get<Schedule[]>(`/booking-setup/staff/${member.id}/availability`)))
        setStaff(loadedStaff.map((member, index) => ({ ...member, availabilities: schedules[index].success ? schedules[index].data || [] : [] })))
      }
      setLoading(false)
    }
    void load()
    const refresh = () => { void load() }
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh) }
  }, [])

  const activeServices = services.filter(service => service.status === 'ACTIVE')
  const activeStaff = staff.filter(member => member.isActive)
  const schedule = useMemo(() => {
    const byDay = new Map<number, Schedule>()
    staff.forEach(member => member.availabilities?.forEach(item => {
      if (item.isAvailable && !item.isDayOff && !byDay.has(item.dayOfWeek)) byDay.set(item.dayOfWeek, item)
    }))
    return byDay
  }, [staff])
  const needsStaff = activeServices.some(service => service.staffRequired) || rules?.allowStaffSelection === true
  const steps = [
    { label: 'Services', href: '/seller/booking-setup/services', complete: bookingStatus?.checks.services ?? false, icon: Scissors },
    { label: 'Staff', href: '/seller/booking-setup/staff', complete: bookingStatus?.checks.staff ?? false, icon: Users },
    { label: 'Availability', href: '/seller/booking-setup/availability', complete: bookingStatus?.checks.availability ?? false, icon: Calendar },
    { label: 'Booking Rules', href: '/seller/booking-setup/rules', complete: bookingStatus?.checks.rules ?? false, icon: Settings2 },
    { label: 'Preview', href: '/discover', complete: bookingStatus?.checks.preview ?? false, icon: Eye },
  ]
  const completedSteps = steps.filter(step => step.complete).length
  const configurationReady = bookingStatus?.configured ?? false
  const ready = bookingStatus?.status === 'LIVE'
  const firstIncomplete = steps.find(step => !step.complete)

  const enableBookings = async () => {
    setActionLoading(true)
    setError('')
    const response = await api.post<BookingStatus>('/booking-setup/enable', {})
    if (response.success) {
      const statusRes = await api.get<BookingStatus>('/booking-setup/status')
      if (statusRes.success && statusRes.data) setBookingStatus(statusRes.data)
    } else setError(response.error || 'Bookings could not be enabled.')
    setActionLoading(false)
  }

  const disableBookings = async () => {
    if (!window.confirm('Disable bookings? Customers will no longer be able to create new bookings through your shop.')) return
    setActionLoading(true)
    setError('')
    const response = await api.post<BookingStatus>('/booking-setup/disable', {})
    if (response.success) {
      const statusRes = await api.get<BookingStatus>('/booking-setup/status')
      if (statusRes.success && statusRes.data) setBookingStatus(statusRes.data)
    } else setError(response.error || 'Bookings could not be disabled.')
    setActionLoading(false)
  }

  if (loading) return <SellerSidebar><div className="py-20 text-center text-warm-800/60">Loading your booking workspace...</div></SellerSidebar>

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Retry</button></div>}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-primary"><Sparkles size={18} /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Seller workspace</span></div><h1 className="font-display text-3xl font-bold text-warm-900">Booking Setup</h1><p className="mt-1 text-warm-800/60">Configure your services, availability, staff, and booking rules.</p></div>
          <div className="flex flex-wrap items-center gap-3"><div className={`min-w-[190px] rounded-xl border px-4 py-3 ${ready ? 'border-green-200 bg-green-50/60' : 'border-warm-200 bg-white'}`}><p className="text-xs font-semibold uppercase tracking-wide text-warm-800/50">Booking status</p><p className="font-semibold text-warm-900">{bookingStatus?.status === 'NOT_CONFIGURED' ? 'Not Configured' : bookingStatus?.status === 'ALMOST_READY' ? 'Almost Ready' : bookingStatus?.status === 'LIVE' ? 'Live' : 'Ready'}</p><p className="text-xs text-warm-800/60">{ready ? 'Bookings are live. Customers can currently make bookings.' : configurationReady ? 'Your booking system is ready.' : bookingStatus?.missing[0] || 'Complete your setup to start accepting bookings.'}</p></div><Button variant="outline" onClick={() => router.push('/discover')} icon={<Eye size={17} />}>Preview Booking Page</Button>{configurationReady && !ready && <Button onClick={enableBookings} loading={actionLoading} icon={<CheckCircle2 size={17} />}>Enable Bookings</Button>}{ready && <Button variant="outline" onClick={disableBookings} loading={actionLoading}>Disable Bookings</Button>}</div>
        </header>

        <Card className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-xl font-bold text-warm-900">Set up your booking system</h2><p className="mt-1 text-sm text-warm-800/60">{completedSteps} of {steps.length} steps completed</p></div><div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-warm-100"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completedSteps / steps.length * 100}%` }} /></div></div><div className="mt-6 grid gap-2 md:grid-cols-5">{steps.map((step, index) => { const Icon = step.icon; return <button key={step.label} type="button" onClick={() => router.push(step.href)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${step.complete ? 'border-green-200 bg-green-50/60' : index === completedSteps ? 'border-primary bg-primary/5' : 'border-warm-200 hover:bg-warm-50'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.complete ? 'bg-green-600 text-white' : 'bg-warm-100 text-warm-800/60'}`}>{step.complete ? <Check size={16} /> : <Icon size={16} />}</span><span className="text-sm font-medium text-warm-900">{index + 1}. {step.label}</span></button> })}</div></Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-6">
          <Section title="Services" question="What can customers book?" icon={<Scissors size={19} />} action="Manage Services" onClick={() => router.push('/seller/booking-setup/services')}>{activeServices.length === 0 ? <Empty text="You haven't added any bookable services yet." action="Add Your First Service" onClick={() => router.push('/seller/booking-setup/services')} /> : <div className="mt-5 divide-y divide-warm-200">{activeServices.slice(0, 6).map(service => <div key={service.id} className="flex items-center justify-between gap-3 py-3 first:pt-0"><div className="min-w-0"><p className="truncate font-medium text-warm-900">{service.name}</p><p className="text-sm text-warm-800/60">GH₵{service.price} · {service.duration}</p></div><div className="flex shrink-0 items-center gap-2"><Badge variant="verified">Active</Badge><button type="button" onClick={() => router.push('/seller/booking-setup/services')} className="text-sm font-medium text-primary">Edit</button></div></div>)}</div>}</Section>
          <Section title="Staff" question="Who can customers book with?" icon={<Users size={19} />} action="Manage Staff" onClick={() => router.push('/seller/booking-setup/staff')}><div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4"><p className="font-medium text-warm-900">{rules?.allowStaffSelection === false ? 'Automatic assignment enabled' : activeStaff.length ? 'Customers choose a staff member' : 'Choose how staff should work'}</p><p className="mt-1 text-sm text-warm-800/65">{rules?.allowStaffSelection === false ? 'PickAmGo will assign an available qualified person automatically.' : activeStaff.length ? `${activeStaff.length} active staff member${activeStaff.length === 1 ? '' : 's'} configured.` : 'Solo businesses can use automatic assignment without adding staff.'}</p></div>{activeStaff.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{activeStaff.slice(0, 6).map(member => <div key={member.id} className="flex items-center gap-2 rounded-full border border-warm-200 bg-white py-1.5 pl-1.5 pr-3"><div className="h-7 w-7 overflow-hidden rounded-full bg-warm-100">{member.avatar && <img src={member.avatar} alt="" className="h-full w-full object-cover" />}</div><span className="text-sm text-warm-900">{member.name}</span></div>)}</div>}</Section>
          <Section title="Availability" question="When can customers book?" icon={<Calendar size={19} />} action="Edit Availability" onClick={() => router.push('/seller/booking-setup/availability')}><div className="mt-5 grid gap-2 sm:grid-cols-2">{days.map((day, index) => { const item = schedule.get(index); return <div key={day} className="flex items-center justify-between rounded-xl bg-warm-50 px-4 py-3"><span className="font-medium text-warm-900">{day}</span><span className={`text-sm ${item ? 'text-warm-800' : 'text-warm-800/45'}`}>{item ? `${formatTime(item.startTime)} - ${formatTime(item.endTime)}` : 'Closed'}</span></div> })}</div><p className="mt-4 flex items-center gap-2 text-sm text-warm-800/60"><Clock3 size={15} /> Slots use working hours, breaks, service duration, buffers, and existing bookings.</p></Section>
          <Section title="Booking Rules" question="What restrictions apply?" icon={<Settings2 size={19} />} action="Manage Rules" onClick={() => router.push('/seller/booking-setup/rules')}><div className="mt-5 grid gap-3 sm:grid-cols-2"><Rule label="Confirmation" value={rules?.autoConfirm ? 'Automatic' : 'Seller approval'} /><Rule label="Minimum notice" value={`${rules?.minBookingNoticeHours ?? 2} hours`} /><Rule label="Advance booking" value={`${rules?.maxAdvanceBookingDays ?? 30} days`} /><Rule label="Buffer" value={`${rules?.bufferTimeMinutes ?? 0} minutes`} /><Rule label="Cancellation" value={`${rules?.cancellationHours ?? 24} hours before`} /></div></Section>
        </div><aside className="space-y-6">
          <Card className="p-5"><div className="flex items-center gap-2"><Eye size={19} className="text-primary" /><h2 className="font-display text-lg font-bold text-warm-900">Customer Experience</h2></div><p className="mt-1 text-sm text-warm-800/60">See what customers will experience.</p><div className="mt-5 space-y-2">{['Choose a service', rules?.allowStaffSelection === false ? 'Automatic staff assignment' : 'Choose a person', 'Choose date and time', 'Confirm booking'].map((label, index) => <div key={label} className="flex items-center gap-3 rounded-xl border border-warm-200 bg-white p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><span className="text-sm font-medium text-warm-900">{label}</span></div>)}</div><Button fullWidth className="mt-5" variant="outline" onClick={() => router.push('/discover')} icon={<Eye size={16} />}>Open Booking Preview</Button></Card>
          <Card className={`p-5 ${ready ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'}`}><div className="flex items-center gap-2"><CheckCircle2 size={19} className={ready ? 'text-green-600' : 'text-yellow-600'} /><h2 className="font-display text-lg font-bold text-warm-900">Booking Readiness</h2></div><div className="mt-4 space-y-3"><Readiness label="At least one active service" complete={bookingStatus?.checks.services ?? false} /><Readiness label="Staff configuration complete" complete={bookingStatus?.checks.staff ?? false} /><Readiness label="Availability configured" complete={bookingStatus?.checks.availability ?? false} /><Readiness label="Booking rules configured" complete={bookingStatus?.checks.rules ?? false} /><Readiness label="Booking page ready" complete={bookingStatus?.checks.preview ?? false} /></div>{ready ? <><p className="mt-5 text-sm font-medium text-green-800">Bookings are live. Customers can currently make bookings.</p><Button fullWidth className="mt-4" variant="outline" onClick={disableBookings} loading={actionLoading}>Disable Bookings</Button></> : configurationReady ? <Button fullWidth className="mt-5" onClick={enableBookings} loading={actionLoading}>Enable Bookings</Button> : <><p className="mt-5 text-sm text-warm-800/65">{bookingStatus?.missing[0] || 'Complete your setup to start accepting bookings.'}</p><Button fullWidth className="mt-3" onClick={() => router.push(firstIncomplete?.href || '/discover')}>Continue Setup <ArrowRight size={16} /></Button></>}</Card>
        </aside></div>
      </div>
    </SellerSidebar>
  )
}

function Section({ title, question, icon, action, onClick, children }: { title: string; question: string; icon: React.ReactNode; action: string; onClick: () => void; children: React.ReactNode }) { return <Card className="p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div><h2 className="font-display text-xl font-bold text-warm-900">{title}</h2><p className="text-sm text-warm-800/60">{question}</p></div></div><Button size="sm" variant="outline" onClick={onClick}>{action}</Button></div>{children}</Card> }
function Empty({ text, action, onClick }: { text: string; action: string; onClick: () => void }) { return <div className="mt-5 rounded-xl border border-dashed border-warm-300 p-6 text-center"><p className="text-sm text-warm-800/60">{text}</p><Button size="sm" className="mt-4" onClick={onClick} icon={<Plus size={16} />}>{action}</Button></div> }
function Rule({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-warm-200 p-3"><p className="text-xs text-warm-800/50">{label}</p><p className="mt-1 font-medium text-warm-900">{value}</p></div> }
function Readiness({ label, complete }: { label: string; complete: boolean }) { return <div className="flex items-center gap-2 text-sm text-warm-900">{complete ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-600" />}<span>{label}</span></div> }
function formatTime(time: string) { const [hour, minute] = time.split(':').map(Number); const suffix = hour >= 12 ? 'PM' : 'AM'; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}` }
