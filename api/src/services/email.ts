import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'no-reply@pickamgo.com'
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'PickAmGo'
const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || ''

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

type SendEmailResult = {
  success: boolean
  error?: string
  messageId?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!RESEND_API_KEY || !resend) {
    return { success: false, error: 'RESEND_API_KEY is not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    })

    if (error) {
      return { success: false, error: error.message || 'Failed to send email' }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    return { success: false, error: message }
  }
}

export async function sendEmailDirect(options: SendEmailOptions): Promise<SendEmailResult> {
  return sendEmail(options)
}

export function buildBaseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #E85D2E 100%); padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 28px 24px; color: #1f2937; }
    .button { display: inline-block; padding: 12px 28px; background-color: #FF6B35; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    .button-secondary { background-color: #f3f4f6; color: #374151; }
    .footer { background-color: #f9fafb; padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer a { color: #FF6B35; text-decoration: none; }
    .info-box { background-color: #fff7ed; border-left: 4px solid #FF6B35; padding: 14px 18px; border-radius: 8px; margin: 16px 0; }
    .info-box p { margin: 0; font-size: 14px; color: #4b5563; }
    .order-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .order-table th { background-color: #fff7ed; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px; }
    .order-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .order-table td:last-child { text-align: right; font-weight: 600; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .status-pending { background-color: #fef3c7; color: #92400e; }
    .status-confirmed { background-color: #dbeafe; color: #1e40af; }
    .status-delivered { background-color: #d1fae5; color: #065f46; }
    .status-cancelled { background-color: #fee2e2; color: #991b1b; }
    .section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #f3f4f6; }
    .section-title { font-size: 14px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PickAmGo</h1>
      <p>Your local marketplace</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PickAmGo. All rights reserved.</p>
      <p style="margin-top: 6px;">
        <a href="${APP_URL}">Visit PickAmGo</a> &middot; <a href="${APP_URL}/help">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, name: string): Promise<SendEmailResult> {
  const body = `
    <h2>Welcome to PickAmGo, ${name}!</h2>
    <p>Thank you for joining PickAmGo. We're excited to have you on board.</p>
    <p>PickAmGo is your one-stop marketplace for products and services near you. Discover local sellers, book services, and get things delivered fast.</p>
    <div class="info-box">
      <p><strong>Your account:</strong> ${to}</p>
    </div>
    <p>Here's what you can do next:</p>
    <ul>
      <li>Discover products and services from local sellers</li>
      <li>Book services with trusted providers</li>
      <li>Get fast delivery with our rider network</li>
    </ul>
    <a href="${APP_URL}/discover" class="button">Start Shopping</a>
    <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
  `

  return sendEmail({
    to,
    subject: 'Welcome to PickAmGo 🎉',
    html: buildBaseHtml('Welcome to PickAmGo', body),
    text: `Welcome to PickAmGo, ${name}! Thank you for joining. Visit ${APP_URL}/discover to start shopping.`,
  })
}

export async function sendSignInNotificationEmail(to: string, name: string, details: { date: string; location?: string; browser?: string }): Promise<SendEmailResult> {
  const body = `
    <h2>New sign-in to your PickAmGo account</h2>
    <p>Hi ${name},</p>
    <p>We noticed a new sign-in to your PickAmGo account.</p>
    <div class="info-box">
      <p><strong>Date:</strong> ${details.date}</p>
      ${details.location ? `<p><strong>Location:</strong> ${details.location}</p>` : ''}
      ${details.browser ? `<p><strong>Browser:</strong> ${details.browser}</p>` : ''}
    </div>
    <p>If this was you, you can safely ignore this email.</p>
    <p>If you did not sign in recently, please secure your account by changing your password immediately.</p>
    <a href="${APP_URL}/settings" class="button">Account Settings</a>
  `

  return sendEmail({
    to,
    subject: 'New sign-in to your PickAmGo account',
    html: buildBaseHtml('Sign-in Notification', body),
    text: `New sign-in detected on ${details.date}. If this wasn't you, please secure your account.`,
  })
}

export async function sendEmailVerificationEmail(to: string, name: string, verifyUrl: string): Promise<SendEmailResult> {
  const body = `
    <h2>Verify your email address</h2>
    <p>Hi ${name},</p>
    <p>Thank you for signing up for PickAmGo. Please verify your email address to activate your account.</p>
    <a href="${verifyUrl}" class="button">Verify Email</a>
    <p>This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    <div class="info-box">
      <p><strong>Security tip:</strong> PickAmGo will never ask for your password or verification code by email.</p>
    </div>
  `

  return sendEmail({
    to,
    subject: 'Verify your PickAmGo email address',
    html: buildBaseHtml('Verify Email', body),
    text: `Verify your email address: ${verifyUrl}. This link expires in 24 hours.`,
  })
}

export async function sendOrderConfirmationEmail(to: string, order: {
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  deliveryMethod?: string
  paymentMethod?: string
  createdAt: string
  deliveryAddress?: string
}): Promise<SendEmailResult> {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center; color: #6b7280;">x${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">GH₵${item.price.toFixed(2)}</td>
    </tr>
  `).join('')

  const body = `
    <h2>Order Confirmed! 🎉</h2>
    <p>Your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
    <div class="info-box">
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod || 'Cash on Delivery'}</p>
      <p><strong>Delivery:</strong> ${order.deliveryMethod?.replace(/_/g, ' ').toLowerCase() || 'Standard'}</p>
      ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
    </div>
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; font-weight: 700;">Total</td>
          <td style="padding: 12px; text-align: right; font-weight: 700; color: #FF6B35; font-size: 16px;">GH₵${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <a href="${APP_URL}/orders" class="button">Track Your Order</a>
  `

  return sendEmail({
    to,
    subject: `Order Confirmation #${order.orderNumber}`,
    html: buildBaseHtml(`Order ${order.orderNumber}`, body),
    text: `Order #${order.orderNumber} confirmed. Total: GH₵${order.total.toFixed(2)}. Track at ${APP_URL}/orders`,
  })
}

export async function sendOrderStatusEmail(to: string, order: {
  orderNumber: string
  status: string
  previousStatus?: string
  deliveryAddress?: string
  customerName?: string
  trackingUrl?: string
}): Promise<SendEmailResult> {
  const statusConfig: Record<string, { subject: string; heading: string; message: string; button: string; buttonUrl: string }> = {
    CONFIRMED: {
      subject: `Your PickAmGo order #${order.orderNumber} has been confirmed`,
      heading: 'Order Confirmed!',
      message: 'Your order has been confirmed and is being prepared.',
      button: 'View Order',
      buttonUrl: `${APP_URL}/orders`,
    },
    PREPARING: {
      subject: `Your PickAmGo order #${order.orderNumber} is being prepared`,
      heading: 'Preparing Your Order',
      message: 'Your order is being prepared with care.',
      button: 'View Order',
      buttonUrl: `${APP_URL}/orders`,
    },
    READY_FOR_PICKUP: {
      subject: `Your PickAmGo order #${order.orderNumber} is ready`,
      heading: 'Ready for Pickup',
      message: 'Your order is ready for pickup. Please bring your order number.',
      button: 'View Order',
      buttonUrl: `${APP_URL}/orders`,
    },
    OUT_FOR_DELIVERY: {
      subject: `Your PickAmGo order #${order.orderNumber} is on the way 🚴`,
      heading: 'Out for Delivery',
      message: 'Your order is on its way to you.',
      button: 'Track Order',
      buttonUrl: order.trackingUrl || `${APP_URL}/orders`,
    },
    DELIVERED: {
      subject: `Your PickAmGo order #${order.orderNumber} has been delivered`,
      heading: 'Delivered!',
      message: 'Your order has been delivered. Enjoy!',
      button: 'View Order',
      buttonUrl: `${APP_URL}/orders`,
    },
    CANCELLED: {
      subject: `Your PickAmGo order #${order.orderNumber} was cancelled`,
      heading: 'Order Cancelled',
      message: 'Your order has been cancelled. If you made a payment, it will be refunded within 3-5 business days.',
      button: 'Browse Again',
      buttonUrl: `${APP_URL}/discover`,
    },
    FAILED: {
      subject: `Payment failed for order #${order.orderNumber}`,
      heading: 'Payment Failed',
      message: 'We could not process your payment. Please try again or choose a different payment method.',
      button: 'Try Again',
      buttonUrl: `${APP_URL}/orders`,
    },
  }

  const config = statusConfig[order.status] || {
    subject: `Order #${order.orderNumber} - ${order.status}`,
    heading: 'Order Update',
    message: `Your order status is now ${order.status}.`,
    button: 'View Order',
    buttonUrl: `${APP_URL}/orders`,
  }

  const body = `
    <h2>${config.heading}</h2>
    <p>Hi ${order.customerName || 'Customer'},</p>
    <p>Your order <strong>#${order.orderNumber}</strong> has been updated.</p>
    <div class="info-box">
      <p><strong>Status:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${order.status.replace(/_/g, ' ')}</span></p>
      ${order.previousStatus ? `<p><strong>Previous status:</strong> ${order.previousStatus.replace(/_/g, ' ')}</p>` : ''}
      ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
    </div>
    <p>${config.message}</p>
    <a href="${config.buttonUrl}" class="button">${config.button}</a>
  `

  return sendEmail({
    to,
    subject: config.subject,
    html: buildBaseHtml(`Order ${order.orderNumber} Update`, body),
    text: `Order #${order.orderNumber} is now ${order.status}. ${config.message} View at ${config.buttonUrl}`,
  })
}

export async function sendPaymentConfirmationEmail(to: string, payment: {
  orderNumber: string
  amount: number
  method?: string
  reference?: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>Payment Confirmed ✅</h2>
    <p>Your payment for order <strong>#${payment.orderNumber}</strong> has been confirmed.</p>
    <div class="info-box">
      <p><strong>Amount:</strong> GH₵${payment.amount.toFixed(2)}</p>
      ${payment.method ? `<p><strong>Method:</strong> ${payment.method}</p>` : ''}
      ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ''}
    </div>
    <a href="${APP_URL}/orders" class="button">View Order</a>
  `

  return sendEmail({
    to,
    subject: `Payment confirmed for order #${payment.orderNumber}`,
    html: buildBaseHtml(`Payment ${payment.orderNumber}`, body),
    text: `Payment confirmed for order #${payment.orderNumber}. Amount: GH₵${payment.amount.toFixed(2)}. View at ${APP_URL}/orders`,
  })
}

export async function sendRefundEmail(to: string, refund: {
  orderNumber: string
  amount: number
  reason?: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>Refund Processed</h2>
    <p>A refund has been processed for your order <strong>#${refund.orderNumber}</strong>.</p>
    <div class="info-box">
      <p><strong>Amount:</strong> GH₵${refund.amount.toFixed(2)}</p>
      ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
      <p><strong>Status:</strong> Processing (3-5 business days)</p>
    </div>
    <a href="${APP_URL}/orders" class="button">View Order</a>
  `

  return sendEmail({
    to,
    subject: `Refund processed for order #${refund.orderNumber}`,
    html: buildBaseHtml(`Refund ${refund.orderNumber}`, body),
    text: `Refund of GH₵${refund.amount.toFixed(2)} processed for order #${refund.orderNumber}.`,
  })
}

export async function sendNewMessageEmail(to: string, senderName: string, conversationUrl: string, preview?: string): Promise<SendEmailResult> {
  const body = `
    <h2>You received a message from ${senderName}</h2>
    <p><strong>${senderName}</strong> sent you a message on PickAmGo.</p>
    ${preview ? `<div class="info-box"><p>"${preview}"</p></div>` : ''}
    <p>Sign in to view the conversation and reply securely. Message content is not included in this email for your privacy.</p>
    <a href="${conversationUrl}" class="button">Open Message</a>
  `

  return sendEmail({
    to,
    subject: `You received a message from ${senderName}`,
    html: buildBaseHtml('New Message', body),
    text: `You received a message from ${senderName} on PickAmGo. View and reply at ${conversationUrl}`,
  })
}

export async function sendSellerOrderNotification(to: string, order: {
  orderNumber: string
  items: Array<{ name: string; quantity: number }>
  buyerName: string
  deliveryAddress?: string
  customerPhone?: string
}): Promise<SendEmailResult> {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center; color: #6b7280;">x${item.quantity}</td>
    </tr>
  `).join('')

  const body = `
    <h2>New Order Received 🛒</h2>
    <p>You have received a new order <strong>#${order.orderNumber}</strong>.</p>
    <div class="info-box">
      <p><strong>Customer:</strong> ${order.buyerName}</p>
      ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
      ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
    </div>
    <p class="section-title">Order Items</p>
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <a href="${APP_URL}/seller/orders" class="button">Go to Dashboard</a>
  `

  return sendEmail({
    to,
    subject: `New Order #${order.orderNumber}`,
    html: buildBaseHtml(`New Order ${order.orderNumber}`, body),
    text: `New order #${order.orderNumber} from ${order.buyerName}. View at ${APP_URL}/seller/orders`,
  })
}

export async function sendRiderNotification(to: string, delivery: {
  orderNumber: string
  pickupAddress: string
  deliveryAddress: string
  customerName: string
  customerPhone?: string
  items: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>New Delivery Assigned 🚴</h2>
    <p>You have been assigned a new delivery for order <strong>#${delivery.orderNumber}</strong>.</p>
    <div class="info-box">
      <p><strong>Pickup:</strong> ${delivery.pickupAddress}</p>
      <p><strong>Delivery:</strong> ${delivery.deliveryAddress}</p>
      <p><strong>Customer:</strong> ${delivery.customerName}</p>
      ${delivery.customerPhone ? `<p><strong>Customer Phone:</strong> ${delivery.customerPhone}</p>` : ''}
      <p><strong>Items:</strong> ${delivery.items}</p>
    </div>
    <a href="${APP_URL}/rider/deliveries/active" class="button">View Delivery</a>
  `

  return sendEmail({
    to,
    subject: `Delivery Assigned - Order #${delivery.orderNumber}`,
    html: buildBaseHtml(`Delivery ${delivery.orderNumber}`, body),
    text: `New delivery assigned for order #${delivery.orderNumber}. Pickup: ${delivery.pickupAddress}. Delivery: ${delivery.deliveryAddress}. View at ${APP_URL}/rider/deliveries/active`,
  })
}

export async function sendDeliveryAssignmentEmail(to: string, data: {
  orderNumber: string
  riderName: string
  riderPhone?: string
  estimatedArrival?: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>Rider Assigned to Your Order 🚴</h2>
    <p>A rider has been assigned to your order <strong>#${data.orderNumber}</strong>.</p>
    <div class="info-box">
      <p><strong>Rider:</strong> ${data.riderName}</p>
      ${data.riderPhone ? `<p><strong>Rider Phone:</strong> ${data.riderPhone}</p>` : ''}
      ${data.estimatedArrival ? `<p><strong>Estimated Arrival:</strong> ${data.estimatedArrival}</p>` : ''}
    </div>
    <a href="${APP_URL}/orders" class="button">Track Order</a>
  `

  return sendEmail({
    to,
    subject: `Rider assigned to order #${data.orderNumber}`,
    html: buildBaseHtml(`Rider Assigned ${data.orderNumber}`, body),
    text: `Rider ${data.riderName} assigned to order #${data.orderNumber}. Track at ${APP_URL}/orders`,
  })
}

export async function sendDeliveryStatusEmail(to: string, data: {
  orderNumber: string
  status: string
  riderName?: string
  estimatedArrival?: string
}): Promise<SendEmailResult> {
  const statusConfig: Record<string, { heading: string; message: string }> = {
    ACCEPTED: { heading: 'Delivery Accepted', message: 'Your rider has accepted the delivery and is on the way to pickup.' },
    ARRIVED_AT_PICKUP: { heading: 'Rider Arrived at Pickup', message: 'Your rider has arrived at the pickup location.' },
    PICKED_UP: { heading: 'Order Picked Up', message: 'Your order has been picked up and is on its way to you.' },
    OUT_FOR_DELIVERY: { heading: 'Out for Delivery', message: 'Your order is out for delivery.' },
    DELIVERED: { heading: 'Delivered!', message: 'Your order has been delivered. Enjoy!' },
    CANCELLED: { heading: 'Delivery Cancelled', message: 'The delivery for your order has been cancelled.' },
  }

  const config = statusConfig[data.status] || { heading: 'Delivery Update', message: `Delivery status: ${data.status}` }

  const body = `
    <h2>${config.heading}</h2>
    <p>Hi,</p>
    <p>${config.message}</p>
    ${data.riderName ? `<div class="info-box"><p><strong>Rider:</strong> ${data.riderName}</p></div>` : ''}
    ${data.estimatedArrival ? `<p><strong>Estimated arrival:</strong> ${data.estimatedArrival}</p>` : ''}
    <a href="${APP_URL}/orders" class="button">Track Order</a>
  `

  return sendEmail({
    to,
    subject: `${config.heading} - Order #${data.orderNumber}`,
    html: buildBaseHtml(`Delivery ${data.orderNumber}`, body),
    text: `${config.heading} for order #${data.orderNumber}. ${config.message}`,
  })
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<SendEmailResult> {
  const resetUrl = `${APP_URL}/auth/reset?token=${resetToken}`

  const body = `
    <h2>Reset Your Password</h2>
    <p>You requested to reset your password. Click the button below to choose a new password.</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <div class="info-box">
      <p>This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `

  return sendEmail({
    to,
    subject: 'Reset your PickAmGo password',
    html: buildBaseHtml('Reset Password', body),
    text: `Reset your PickAmGo password: ${resetUrl}. This link expires in 1 hour.`,
  })
}

export async function sendBookingConfirmationEmail(to: string, booking: {
  bookingNumber: string
  serviceName: string
  date: string
  time: string
  providerName: string
  location?: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>Booking Confirmed! 📅</h2>
    <p>Your booking <strong>#${booking.bookingNumber}</strong> has been confirmed.</p>
    <div class="info-box">
      <p><strong>Service:</strong> ${booking.serviceName}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Provider:</strong> ${booking.providerName}</p>
      ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ''}
    </div>
    <a href="${APP_URL}/bookings" class="button">View Booking</a>
  `

  return sendEmail({
    to,
    subject: `Booking Confirmed #${booking.bookingNumber}`,
    html: buildBaseHtml(`Booking ${booking.bookingNumber}`, body),
    text: `Booking #${booking.bookingNumber} confirmed for ${booking.serviceName} on ${booking.date} at ${booking.time}.`,
  })
}

export async function sendBookingStatusEmail(to: string, booking: {
  bookingNumber: string
  serviceName: string
  status: string
  date: string
  time: string
  reason?: string
}): Promise<SendEmailResult> {
  const statusConfig: Record<string, { subject: string; heading: string; message: string }> = {
    CONFIRMED: { subject: `Booking #${booking.bookingNumber} confirmed`, heading: 'Booking Confirmed', message: 'Your booking has been confirmed by the service provider.' },
    RESCHEDULED: { subject: `Booking #${booking.bookingNumber} rescheduled`, heading: 'Booking Rescheduled', message: `Your booking has been rescheduled.${booking.reason ? ` Reason: ${booking.reason}` : ''}` },
    CANCELLED: { subject: `Booking #${booking.bookingNumber} cancelled`, heading: 'Booking Cancelled', message: `Your booking has been cancelled.${booking.reason ? ` Reason: ${booking.reason}` : ''}` },
    COMPLETED: { subject: `Booking #${booking.bookingNumber} completed`, heading: 'Booking Completed', message: 'Your booking has been completed. Thank you for using PickAmGo!' },
  }

  const config = statusConfig[booking.status] || { subject: `Booking #${booking.bookingNumber} - ${booking.status}`, heading: 'Booking Update', message: `Your booking status is now ${booking.status}.` }

  const body = `
    <h2>${config.heading}</h2>
    <p>Hi,</p>
    <p>${config.message}</p>
    <div class="info-box">
      <p><strong>Booking:</strong> #${booking.bookingNumber}</p>
      <p><strong>Service:</strong> ${booking.serviceName}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
    </div>
    <a href="${APP_URL}/bookings" class="button">View Booking</a>
  `

  return sendEmail({
    to,
    subject: config.subject,
    html: buildBaseHtml(`Booking ${booking.bookingNumber}`, body),
    text: `${config.message} Booking #${booking.bookingNumber}.`,
  })
}

export async function sendReviewRequestEmail(to: string, review: {
  orderNumber: string
  serviceName?: string
  shopName?: string
  reviewUrl: string
}): Promise<SendEmailResult> {
  const target = review.serviceName || review.shopName || 'your order'

  const body = `
    <h2>How was your experience?</h2>
    <p>Hi,</p>
    <p>Your order <strong>#${review.orderNumber}</strong> has been delivered. We'd love to hear about your experience with ${target}.</p>
    <p>Your feedback helps other customers make better choices and helps sellers improve their service.</p>
    <a href="${review.reviewUrl}" class="button">Leave a Review</a>
    <p style="margin-top: 16px; font-size: 14px; color: #6b7280;">This is a one-time request. You won't receive another review reminder for this order.</p>
  `

  return sendEmail({
    to,
    subject: `How was your PickAmGo order #${review.orderNumber}?`,
    html: buildBaseHtml(`Review Request ${review.orderNumber}`, body),
    text: `How was your order #${review.orderNumber}? Leave a review at ${review.reviewUrl}`,
  })
}

export async function sendWithdrawalRequestedEmail(to: string, withdrawal: {
  amount: number
  method: string
  reference: string
}): Promise<SendEmailResult> {
  const body = `
    <h2>Withdrawal Request Received</h2>
    <p>Your withdrawal request has been received and is pending approval.</p>
    <div class="info-box">
      <p><strong>Amount:</strong> GH₵${withdrawal.amount.toFixed(2)}</p>
      <p><strong>Method:</strong> ${withdrawal.method}</p>
      <p><strong>Reference:</strong> ${withdrawal.reference}</p>
      <p><strong>Status:</strong> Pending Approval</p>
    </div>
    <p>You will be notified once your withdrawal has been processed.</p>
  `

  return sendEmail({
    to,
    subject: 'Withdrawal request received',
    html: buildBaseHtml('Withdrawal Requested', body),
    text: `Withdrawal of GH₵${withdrawal.amount.toFixed(2)} received. Reference: ${withdrawal.reference}.`,
  })
}

export async function sendWithdrawalProcessedEmail(to: string, withdrawal: {
  amount: number
  status: string
  reference: string
  processedAt: string
  failureReason?: string
}): Promise<SendEmailResult> {
  const isSuccess = withdrawal.status === 'COMPLETED'
  const heading = isSuccess ? 'Payout Sent!' : 'Payout Update'
  const message = isSuccess
    ? 'Your withdrawal has been processed successfully.'
    : `Your withdrawal could not be completed.${withdrawal.failureReason ? ` Reason: ${withdrawal.failureReason}` : ''}`

  const body = `
    <h2>${heading}</h2>
    <p>Hi,</p>
    <p>${message}</p>
    <div class="info-box">
      <p><strong>Amount:</strong> GH₵${withdrawal.amount.toFixed(2)}</p>
      <p><strong>Reference:</strong> ${withdrawal.reference}</p>
      <p><strong>Status:</strong> ${withdrawal.status}</p>
      <p><strong>Processed:</strong> ${new Date(withdrawal.processedAt).toLocaleString()}</p>
    </div>
  `

  return sendEmail({
    to,
    subject: `${isSuccess ? 'Payout sent' : 'Payout update'} - GH₵${withdrawal.amount.toFixed(2)}`,
    html: buildBaseHtml(`Payout ${withdrawal.reference}`, body),
    text: `${heading}. Amount: GH₵${withdrawal.amount.toFixed(2)}. Status: ${withdrawal.status}.`,
  })
}

export async function sendSellerAccountEmail(to: string, name: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REACTIVATED', reason?: string): Promise<SendEmailResult> {
  const config: Record<string, { subject: string; heading: string; message: string }> = {
    APPROVED: { subject: 'Your PickAmGo seller account has been approved 🎉', heading: 'Seller Account Approved!', message: 'Congratulations! Your seller account has been approved. You can now start selling on PickAmGo.' },
    REJECTED: { subject: 'Your PickAmGo seller application was not approved', heading: 'Seller Application Update', message: `Your seller application was not approved.${reason ? ` Reason: ${reason}` : ''} Please review our requirements and try again.` },
    SUSPENDED: { subject: 'Your PickAmGo seller account has been suspended', heading: 'Account Suspended', message: `Your seller account has been suspended.${reason ? ` Reason: ${reason}` : ''} Please contact support if you have questions.` },
    REACTIVATED: { subject: 'Your PickAmGo seller account has been reactivated', heading: 'Account Reactivated', message: 'Good news! Your seller account has been reactivated. You can resume selling immediately.' },
  }

  const c = config[status]

  const body = `
    <h2>${c.heading}</h2>
    <p>Hi ${name},</p>
    <p>${c.message}</p>
    ${status === 'APPROVED' ? `<a href="${APP_URL}/seller" class="button">Go to Seller Dashboard</a>` : ''}
    ${status === 'REACTIVATED' ? `<a href="${APP_URL}/seller" class="button">Go to Seller Dashboard</a>` : ''}
  `

  return sendEmail({
    to,
    subject: c.subject,
    html: buildBaseHtml(`Seller ${status}`, body),
    text: c.message,
  })
}

export async function sendRiderAccountEmail(to: string, name: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REACTIVATED', reason?: string): Promise<SendEmailResult> {
  const config: Record<string, { subject: string; heading: string; message: string }> = {
    APPROVED: { subject: 'Your PickAmGo rider account has been approved 🎉', heading: 'Rider Account Approved!', message: 'Congratulations! Your rider account has been approved. You can now start accepting deliveries.' },
    REJECTED: { subject: 'Your PickAmGo rider application was not approved', heading: 'Rider Application Update', message: `Your rider application was not approved.${reason ? ` Reason: ${reason}` : ''} Please review our requirements and try again.` },
    SUSPENDED: { subject: 'Your PickAmGo rider account has been suspended', heading: 'Account Suspended', message: `Your rider account has been suspended.${reason ? ` Reason: ${reason}` : ''} Please contact support if you have questions.` },
    REACTIVATED: { subject: 'Your PickAmGo rider account has been reactivated', heading: 'Account Reactivated', message: 'Good news! Your rider account has been reactivated. You can resume deliveries immediately.' },
  }

  const c = config[status]

  const body = `
    <h2>${c.heading}</h2>
    <p>Hi ${name},</p>
    <p>${c.message}</p>
    ${status === 'APPROVED' ? `<a href="${APP_URL}/rider" class="button">Go to Rider Dashboard</a>` : ''}
    ${status === 'REACTIVATED' ? `<a href="${APP_URL}/rider" class="button">Go to Rider Dashboard</a>` : ''}
  `

  return sendEmail({
    to,
    subject: c.subject,
    html: buildBaseHtml(`Rider ${status}`, body),
    text: c.message,
  })
}

export async function sendAdminNotification(subject: string, html: string, text?: string): Promise<SendEmailResult> {
  if (!ADMIN_NOTIFICATION_EMAIL) {
    return { success: false, error: 'ADMIN_NOTIFICATION_EMAIL is not configured' }
  }

  return sendEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[PickAmGo Admin] ${subject}`,
    html: buildBaseHtml(`Admin: ${subject}`, html),
    text: text || `Admin notification: ${subject}`,
  })
}
