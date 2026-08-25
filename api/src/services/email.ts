import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@pickamgo.com'
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

async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
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

function buildBaseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background-color: #2563eb; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 24px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { background-color: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PickAmGo</h1>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PickAmGo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, name: string): Promise<SendEmailResult> {
  const body = `
    <h2>Welcome to PickAmGo, ${name}!</h2>
    <p>Thank you for joining PickAmGo. We are excited to have you on board.</p>
    <p>PickAmGo is your one-stop marketplace for products and services near you. Discover local sellers, book services, and get things delivered fast.</p>
    <a href="${APP_URL}/discover" class="button">Start Shopping</a>
    <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
  `

  return sendEmail({
    to,
    subject: 'Welcome to PickAmGo!',
    html: buildBaseHtml('Welcome to PickAmGo', body),
    text: `Welcome to PickAmGo, ${name}! Thank you for joining. Visit ${APP_URL}/discover to start shopping.`,
  })
}

export async function sendOrderConfirmationEmail(to: string, order: {
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  deliveryMethod?: string
  paymentMethod?: string
  createdAt: string
}): Promise<SendEmailResult> {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">GH₵${item.price.toFixed(2)}</td>
    </tr>
  `).join('')

  const body = `
    <h2>Order Confirmed!</h2>
    <p>Your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
    <p><strong>Payment:</strong> ${order.paymentMethod || 'Cash on Delivery'}</p>
    <p><strong>Delivery:</strong> ${order.deliveryMethod || 'Standard'}</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">GH₵${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <a href="${APP_URL}/orders" class="button">View My Orders</a>
  `

  return sendEmail({
    to,
    subject: `Order Confirmation #${order.orderNumber}`,
    html: buildBaseHtml(`Order ${order.orderNumber}`, body),
    text: `Order #${order.orderNumber} confirmed. Total: GH₵${order.total.toFixed(2)}. View at ${APP_URL}/orders`,
  })
}

export async function sendOrderStatusEmail(to: string, order: {
  orderNumber: string
  status: string
  previousStatus?: string
}): Promise<SendEmailResult> {
  const statusMessages: Record<string, string> = {
    confirmed: 'Your order has been confirmed and is being prepared.',
    preparing: 'Your order is being prepared.',
    picked_up: 'Your order has been picked up and is on its way.',
    delivered: 'Your order has been delivered. Enjoy!',
    cancelled: 'Your order has been cancelled.',
  }

  const explanation = statusMessages[order.status] || `Your order status is now ${order.status}.`

  const body = `
    <h2>Order Status Update</h2>
    <p>Your order <strong>#${order.orderNumber}</strong> has been updated.</p>
    ${order.previousStatus ? `<p><strong>Previous status:</strong> ${order.previousStatus}</p>` : ''}
    <p><strong>Current status:</strong> ${order.status}</p>
    <p>${explanation}</p>
    <a href="${APP_URL}/orders" class="button">View Order</a>
  `

  return sendEmail({
    to,
    subject: `Order #${order.orderNumber} - ${order.status}`,
    html: buildBaseHtml(`Order ${order.orderNumber} Update`, body),
    text: `Order #${order.orderNumber} is now ${order.status}. ${explanation} View at ${APP_URL}/orders`,
  })
}

export async function sendSellerOrderNotification(to: string, order: {
  orderNumber: string
  items: Array<{ name: string; quantity: number }>
  buyerName: string
  deliveryAddress?: string
}): Promise<SendEmailResult> {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
    </tr>
  `).join('')

  const body = `
    <h2>New Order Received</h2>
    <p>You have received a new order <strong>#${order.orderNumber}</strong>.</p>
    <p><strong>Customer:</strong> ${order.buyerName}</p>
    ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
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
    <h2>New Delivery Assigned</h2>
    <p>You have been assigned a new delivery for order <strong>#${delivery.orderNumber}</strong>.</p>
    <p><strong>Pickup:</strong> ${delivery.pickupAddress}</p>
    <p><strong>Delivery:</strong> ${delivery.deliveryAddress}</p>
    <p><strong>Customer:</strong> ${delivery.customerName}</p>
    ${delivery.customerPhone ? `<p><strong>Customer Phone:</strong> ${delivery.customerPhone}</p>` : ''}
    <p><strong>Items:</strong> ${delivery.items}</p>
    <a href="${APP_URL}/rider/deliveries/active" class="button">View Delivery</a>
  `

  return sendEmail({
    to,
    subject: `Delivery Assigned - Order #${delivery.orderNumber}`,
    html: buildBaseHtml(`Delivery ${delivery.orderNumber}`, body),
    text: `New delivery assigned for order #${delivery.orderNumber}. Pickup: ${delivery.pickupAddress}. Delivery: ${delivery.deliveryAddress}. View at ${APP_URL}/rider/deliveries/active`,
  })
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<SendEmailResult> {
  const resetUrl = `${APP_URL}/auth/reset?token=${resetToken}`

  const body = `
    <h2>Reset Your Password</h2>
    <p>You requested to reset your password. Click the button below to choose a new password.</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p style="margin-top: 16px; font-size: 14px; color: #666;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
  `

  return sendEmail({
    to,
    subject: 'Reset your PickAmGo password',
    html: buildBaseHtml('Reset Password', body),
    text: `Reset your PickAmGo password: ${resetUrl}. This link expires in 1 hour.`,
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
