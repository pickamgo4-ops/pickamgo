export type EmailPurpose =
  | 'welcome'
  | 'signin_notification'
  | 'email_verification'
  | 'password_reset'
  | 'order_confirmation'
  | 'order_status'
  | 'payment_confirmation'
  | 'refund'
  | 'new_message'
  | 'seller_order'
  | 'rider_notification'
  | 'delivery_assignment'
  | 'delivery_status'
  | 'booking_confirmation'
  | 'booking_status'
  | 'review_request'
  | 'withdrawal_requested'
  | 'withdrawal_processed'
  | 'seller_account'
  | 'rider_account'
  | 'admin_notification'
  | 'report_notification'
  | 'report_update'
  | 'referral'
  | 'marketing'
  | 'general'

export interface EmailSenderConfig {
  fromEmail: string
  fromName: string
  replyTo?: string
}

const PICKAMGO_DOMAIN = 'pickamgo.com'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'PickAmGo'

const envEmail = (key: string, fallback: string): string =>
  (process.env[key] || '').trim() || fallback

const senders: Record<EmailPurpose, EmailSenderConfig> = {
  welcome: {
    fromEmail: envEmail('RESEND_HELLO_EMAIL', `hello@${PICKAMGO_DOMAIN}`),
    fromName: FROM_NAME,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  signin_notification: {
    fromEmail: envEmail('RESEND_SECURITY_EMAIL', `security@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Security`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  email_verification: {
    fromEmail: envEmail('RESEND_ACCOUNTS_EMAIL', `accounts@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Accounts`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  password_reset: {
    fromEmail: envEmail('RESEND_ACCOUNTS_EMAIL', `accounts@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Accounts`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  order_confirmation: {
    fromEmail: envEmail('RESEND_ORDERS_EMAIL', `orders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Orders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  order_status: {
    fromEmail: envEmail('RESEND_ORDERS_EMAIL', `orders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Orders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  payment_confirmation: {
    fromEmail: envEmail('RESEND_PAYMENTS_EMAIL', `payments@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Payments`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  refund: {
    fromEmail: envEmail('RESEND_PAYMENTS_EMAIL', `payments@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Payments`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  new_message: {
    fromEmail: envEmail('RESEND_MESSAGES_EMAIL', `messages@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Messages`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  seller_order: {
    fromEmail: envEmail('RESEND_ORDERS_EMAIL', `orders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Orders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  rider_notification: {
    fromEmail: envEmail('RESEND_RIDERS_EMAIL', `riders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Riders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  delivery_assignment: {
    fromEmail: envEmail('RESEND_RIDERS_EMAIL', `riders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Riders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  delivery_status: {
    fromEmail: envEmail('RESEND_RIDERS_EMAIL', `riders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Riders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  booking_confirmation: {
    fromEmail: envEmail('RESEND_BOOKINGS_EMAIL', `bookings@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Bookings`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  booking_status: {
    fromEmail: envEmail('RESEND_BOOKINGS_EMAIL', `bookings@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Bookings`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  review_request: {
    fromEmail: envEmail('RESEND_NOTIFICATIONS_EMAIL', `notifications@${PICKAMGO_DOMAIN}`),
    fromName: FROM_NAME,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  withdrawal_requested: {
    fromEmail: envEmail('RESEND_PAYOUTS_EMAIL', `payouts@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Payouts`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  withdrawal_processed: {
    fromEmail: envEmail('RESEND_PAYOUTS_EMAIL', `payouts@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Payouts`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  seller_account: {
    fromEmail: envEmail('RESEND_SELLERS_EMAIL', `sellers@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Sellers`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  rider_account: {
    fromEmail: envEmail('RESEND_RIDERS_EMAIL', `riders@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Riders`,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  admin_notification: {
    fromEmail: envEmail('RESEND_ADMIN_EMAIL', `admin@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Admin`,
  },
  report_notification: {
    fromEmail: envEmail('RESEND_ADMIN_EMAIL', `admin@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Admin`,
  },
  report_update: {
    fromEmail: envEmail('RESEND_ADMIN_EMAIL', `admin@${PICKAMGO_DOMAIN}`),
    fromName: `${FROM_NAME} Admin`,
  },
  referral: {
    fromEmail: envEmail('RESEND_HELLO_EMAIL', `hello@${PICKAMGO_DOMAIN}`),
    fromName: FROM_NAME,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  marketing: {
    fromEmail: envEmail('RESEND_MARKETING_EMAIL', `marketing@${PICKAMGO_DOMAIN}`),
    fromName: FROM_NAME,
    replyTo: envEmail('RESEND_SUPPORT_EMAIL', `support@${PICKAMGO_DOMAIN}`),
  },
  general: {
    fromEmail: envEmail('RESEND_NOREPLY_EMAIL', `noreply@${PICKAMGO_DOMAIN}`),
    fromName: FROM_NAME,
  },
}

export function getSender(purpose: EmailPurpose): EmailSenderConfig {
  return senders[purpose] || senders.general
}

export function resolveSender(
  purpose: EmailPurpose,
  overrides?: Partial<EmailSenderConfig>
): EmailSenderConfig {
  const base = getSender(purpose)
  if (!overrides) return base
  return {
    fromEmail: overrides.fromEmail || base.fromEmail,
    fromName: overrides.fromName || base.fromName,
    replyTo: overrides.replyTo ?? base.replyTo,
  }
}
