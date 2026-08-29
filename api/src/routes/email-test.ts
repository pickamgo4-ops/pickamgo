import { Router } from 'express'
import { sendEmailDirect, buildBaseHtml } from '../services/email'

const router = Router()

router.post('/email/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found' })
  }

  const { to, subject, html } = req.body || {}

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing to, subject, or html' })
  }

  sendEmailDirect({
    to,
    subject,
    html: buildBaseHtml(subject, html),
    purpose: 'general',
  })
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, error: error.message }))
})

router.get('/email/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found' })
  }

  const testEmail = process.env.RESEND_TEST_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || ''

  if (!testEmail) {
    return res.json({
      success: false,
      error: 'No test email configured. Set RESEND_TEST_EMAIL or ADMIN_NOTIFICATION_EMAIL in .env',
      config: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || process.env.RESEND_NOREPLY_EMAIL || 'noreply@pickamgo.com',
        fromName: process.env.RESEND_FROM_NAME || 'PickAmGo',
      },
    })
  }

  sendEmailDirect({
    to: testEmail,
    subject: 'PickAmGo Email Test',
    html: buildBaseHtml('Email Test', '<h2>Email Test Successful</h2><p>If you see this, PickAmGo email is working.</p>'),
    purpose: 'general',
  })
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, error: error.message }))
})

export default router
