import { ShieldAlert } from 'lucide-react'

export function PaymentSafetyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
      <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-red-700 dark:text-red-400" />
      <p><strong>Payment Safety Notice:</strong> For your safety, only make payments through PickAmGo. We are not responsible for payments or transactions made outside PickAmGo.</p>
    </div>
  )
}
