import { RiderDeliveryStatus } from '../types/rider'
import {
  Package, Truck, MapPin, CheckCircle, Clock, Navigation, AlertCircle, XCircle, Info,
  User, Shield, Bell, Lock, Wallet, Globe, FileText
} from 'lucide-react'

export const DELIVERY_STATUS_FLOW: Record<RiderDeliveryStatus, { label: string; icon: any }> = {
  PENDING: { label: 'Available', icon: Package },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle },
  GOING_TO_PICKUP: { label: 'Going to Pickup', icon: Navigation },
  ARRIVED_AT_PICKUP: { label: 'Arrived at Pickup', icon: MapPin },
  PICKED_UP: { label: 'Order Picked Up', icon: Package },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: Truck },
  IN_TRANSIT: { label: 'In Transit', icon: Truck },
  ARRIVED_AT_CUSTOMER: { label: 'Arrived at Customer', icon: MapPin },
  DELIVERED: { label: 'Delivered', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', icon: XCircle },
  FAILED: { label: 'Failed', icon: AlertCircle },
}

export const DELIVERY_STATUS_STEPS: RiderDeliveryStatus[] = [
  'ACCEPTED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'IN_TRANSIT',
  'ARRIVED_AT_CUSTOMER',
  'DELIVERED',
]

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Available',
  ACCEPTED: 'Accepted',
  GOING_TO_PICKUP: 'Going to Pickup',
  ARRIVED_AT_PICKUP: 'Arrived at Pickup',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_CUSTOMER: 'Arrived at Customer',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
}

export const DELIVERY_BADGE_VARIANT: Record<string, 'verified' | 'deal' | 'default' | 'delivery' | 'trending' | 'new' | 'popular'> = {
  PENDING: 'default',
  ACCEPTED: 'delivery',
  GOING_TO_PICKUP: 'delivery',
  ARRIVED_AT_PICKUP: 'delivery',
  PICKED_UP: 'new',
  OUT_FOR_DELIVERY: 'delivery',
  IN_TRANSIT: 'delivery',
  ARRIVED_AT_CUSTOMER: 'delivery',
  DELIVERED: 'verified',
  CANCELLED: 'deal',
  FAILED: 'deal',
}

export const VEHICLE_TYPES: Array<{ value: string; label: string; icon: any }> = [
  { value: 'BICYCLE', label: 'Bicycle', icon: Package },
  { value: 'MOTORCYCLE', label: 'Motorcycle', icon: Truck },
  { value: 'CAR', label: 'Car', icon: Truck },
  { value: 'OTHER', label: 'Other', icon: Info },
]

export const PAYOUT_STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: 'PENDING', label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'PROCESSING', label: 'Processing', color: 'text-blue-600 bg-blue-50' },
  { value: 'SUCCESS', label: 'Paid', color: 'text-green-600 bg-green-50' },
  { value: 'FAILED', label: 'Failed', color: 'text-red-600 bg-red-50' },
  { value: 'REVERSED', label: 'Reversed', color: 'text-orange-600 bg-orange-50' },
]

export const REPORT_PROBLEM_OPTIONS: Array<{ value: string; label: string; icon: any }> = [
  { value: 'Customer unavailable', label: 'Customer Unavailable', icon: AlertCircle },
  { value: 'Wrong address', label: 'Wrong Address', icon: MapPin },
  { value: 'Customer refuses delivery', label: 'Customer Refuses Delivery', icon: XCircle },
  { value: 'Seller has not prepared the order', label: 'Seller Has Not Prepared the Order', icon: Clock },
  { value: 'Vehicle problem', label: 'Vehicle Problem', icon: Truck },
  { value: 'Accident/emergency', label: 'Accident/Emergency', icon: AlertCircle },
  { value: 'Cannot complete delivery', label: 'Cannot Complete Delivery', icon: XCircle },
  { value: 'Other', label: 'Other', icon: Info },
]

export const HELP_TOPICS: Array<{ title: string; description: string; icon: any; href?: string }> = [
  { title: 'Getting Started', description: 'Learn how to start accepting deliveries', icon: Info, href: '#' },
  { title: 'Delivery Guidelines', description: 'How to complete deliveries successfully', icon: Truck, href: '#' },
  { title: 'Payment Problems', description: 'Issues with earnings or payouts', icon: AlertCircle, href: '#' },
  { title: 'Verification Problems', description: 'Issues with rider verification', icon: XCircle, href: '#' },
  { title: 'App Problems', description: 'Technical issues with the rider app', icon: AlertCircle, href: '#' },
]

export const HELP_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'How do I accept a delivery?',
    answer: 'Go to Available Deliveries and tap the Accept button on any delivery request. You must be online and verified to accept deliveries.',
  },
  {
    question: 'How do I update delivery status?',
    answer: 'On the Active Delivery screen, use the status buttons to update your progress: Arrived at Pickup, Picked Up, Out for Delivery, Arrived at Customer, and Delivered.',
  },
  {
    question: 'What is the delivery confirmation code?',
    answer: 'When you arrive at the customer, a 4-digit verification code will appear on your screen. Show it to the customer or share it — the customer will confirm it to verify the delivery.',
  },
  {
    question: 'When do I get paid?',
    answer: 'Earnings are updated immediately after delivery completion. You can request a payout once your balance reaches the minimum threshold (GHS 20).',
  },
  {
    question: 'What if a customer is not available?',
    answer: 'You can message the customer through the in-app messaging system. If they remain unreachable, use Report a Problem to notify support.',
  },
  {
    question: 'Can I go offline while on a delivery?',
    answer: 'You can update your online status between deliveries. During an active delivery, you will remain busy until the delivery is completed.',
  },
]

export const SETTINGS_SECTIONS: Array<{ id: string; title: string; description: string; icon: any }> = [
  { id: 'account', title: 'Account Settings', description: 'Update your profile information', icon: User },
  { id: 'security', title: 'Security & Password', description: 'Manage your password and security', icon: Shield },
  { id: 'notifications', title: 'Notification Preferences', description: 'Choose what notifications you receive', icon: Bell },
  { id: 'privacy', title: 'Privacy', description: 'Control your privacy settings', icon: Lock },
  { id: 'payout', title: 'Mobile Money Payout Settings', description: 'Manage your payout methods', icon: Wallet },
  { id: 'language', title: 'Language', description: 'Select your preferred language', icon: Globe },
  { id: 'terms', title: 'Terms & Policies', description: 'Read terms and privacy policy', icon: FileText },
]

export const NOTIFICATION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  NEW_DELIVERY: { label: 'New Delivery Request', icon: Package, color: 'text-blue-600 bg-blue-50' },
  DELIVERY_ASSIGNED: { label: 'Delivery Assigned', icon: Package, color: 'text-purple-600 bg-purple-50' },
  DELIVERY_ACCEPTED: { label: 'Delivery Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  DELIVERY_STATUS_UPDATE: { label: 'Delivery Status Update', icon: Truck, color: 'text-orange-600 bg-orange-50' },
  CUSTOMER_MESSAGE: { label: 'Customer Message', icon: AlertCircle, color: 'text-pink-600 bg-pink-50' },
  ORDER_CANCELLED: { label: 'Order Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
  PAYOUT_INITIATED: { label: 'Payout Initiated', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  PAYOUT_PROCESSED: { label: 'Payout Processed', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  PAYOUT_FAILED: { label: 'Payout Failed', icon: XCircle, color: 'text-red-600 bg-red-50' },
  VERIFICATION_UPDATE: { label: 'Verification Update', icon: Shield, color: 'text-indigo-600 bg-indigo-50' },
  SYSTEM_ANNOUNCEMENT: { label: 'System Announcement', icon: Info, color: 'text-warm-800 bg-warm-100' },
  SUPPORT_UPDATE: { label: 'Support Update', icon: AlertCircle, color: 'text-teal-600 bg-teal-50' },
}

export function getRiderStatus(rider: { isOnline: boolean; isAvailable: boolean; activeDelivery?: any }): { status: 'offline' | 'online' | 'on_delivery'; label: string; color: string } {
  if (rider.activeDelivery) {
    return { status: 'on_delivery', label: 'On Delivery', color: 'text-purple-600 bg-purple-50' }
  }
  if (rider.isOnline) {
    return { status: 'online', label: 'Online', color: 'text-green-600 bg-green-50' }
  }
  return { status: 'offline', label: 'Offline', color: 'text-warm-600 bg-warm-100' }
}

export function formatCurrency(amount: number): string {
  return `GH₵${Number(amount || 0).toFixed(2)}`
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function getInitials(name: string): string {
  if (!name) return 'R'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}