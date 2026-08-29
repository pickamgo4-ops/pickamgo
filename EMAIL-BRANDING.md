# PickAmGo Email Branding & BIMI Setup

## Overview

This document explains how PickAmGo transactional emails are branded and how to configure **BIMI (Brand Indicators for Message Identification)** so that supported email clients display the PickAmGo logo as the sender avatar/profile image.

## Current Branding

All transactional emails sent by PickAmGo include:
- **Sender name:** PickAmGo (or role-specific variant such as "PickAmGo Orders")
- **Sender address:** determined by email purpose using centralized role-based addresses on `@pickamgo.com`
- **Logo in email header:** the PickAmGo logo is displayed at the top of every email via the `LOGO_URL` environment variable
- **BIMI reference:** emails include a `<link rel="bimi" href="...">` tag in the `<head>`

## BIMI Requirements

BIMI allows email clients that support it (e.g., Yahoo, some desktop clients) to display your brand logo next to the sender name. **Gmail requires an additional Verified Mark Certificate (VMC).**

### 1. Domain Authentication (Required)

Before BIMI will work, your sending domain must have proper email authentication:

| Record | Type | Purpose |
|--------|------|---------|
| SPF | TXT | Authorizes Resend to send email on behalf of your domain |
| DKIM | TXT/CNAME | Allows receivers to verify that emails are authentic and unaltered |
| DMARC | TXT | Tells receivers how to handle emails that fail SPF/DKIM checks |

**Do not weaken these records.** They protect your domain from spoofing and are required for BIMI.

### 2. BIMI DNS Record

Add a TXT record to your DNS zone:

```
Host: default._bimi.pickamgo.com
Value: v=BIMI1; l=https://pickamgo.com/bimi.svg
TTL: 3600
```

- The `l=` value must point to a **publicly accessible, HTTPS-hosted SVG file** on the same domain as your sending address.
- The SVG must be **BIMI-compliant**: simple shapes only, no gradients, no shadows, no raster images, SVG 1.2 Tiny profile.
- A sample compliant SVG is provided at `public/bimi.svg`.

### 3. Verified Mark Certificate (VMC)

**Gmail requires a VMC** to display BIMI logos. Without a VMC:
- Gmail will **not** show the BIMI logo.
- Other providers (Yahoo, etc.) may still show the logo if BIMI is otherwise correctly configured.

To obtain a VMC:
1. You must have a registered trademark for your logo.
2. Purchase a VMC from a trusted certificate authority (e.g., Entrust, DigiCert).
3. Install the certificate on your BIMI-serving domain.

**This project does not obtain or manage VMCs.** If you want Gmail BIMI support, you must acquire a VMC separately and update the BIMI DNS record to reference it.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | (empty) | Resend API key |
| `RESEND_FROM_NAME` | `PickAmGo` | Base sender display name |
| `RESEND_FROM_EMAIL` | `noreply@pickamgo.com` | Default sender email address |
| `RESEND_HELLO_EMAIL` | `hello@pickamgo.com` | Welcome/general emails |
| `RESEND_SUPPORT_EMAIL` | `support@pickamgo.com` | Support reply-to address |
| `RESEND_ORDERS_EMAIL` | `orders@pickamgo.com` | Order confirmations and updates |
| `RESEND_ACCOUNTS_EMAIL` | `accounts@pickamgo.com` | Verification and password resets |
| `RESEND_PAYMENTS_EMAIL` | `payments@pickamgo.com` | Payment confirmations and refunds |
| `RESEND_PAYOUTS_EMAIL` | `payouts@pickamgo.com` | Payout notifications |
| `RESEND_SELLERS_EMAIL` | `sellers@pickamgo.com` | Seller onboarding and status |
| `RESEND_RIDERS_EMAIL` | `riders@pickamgo.com` | Rider onboarding and deliveries |
| `RESEND_BOOKINGS_EMAIL` | `bookings@pickamgo.com` | Booking confirmations and updates |
| `RESEND_MESSAGES_EMAIL` | `messages@pickamgo.com` | New message notifications |
| `RESEND_NOTIFICATIONS_EMAIL` | `notifications@pickamgo.com` | General automated notifications |
| `RESEND_ADMIN_EMAIL` | `admin@pickamgo.com` | Internal admin notifications |
| `RESEND_SECURITY_EMAIL` | `security@pickamgo.com` | Security alerts |
| `RESEND_MARKETING_EMAIL` | `marketing@pickamgo.com` | Marketing and promotional emails |
| `RESEND_NOREPLY_EMAIL` | `noreply@pickamgo.com` | No-reply automated emails |
| `ADMIN_NOTIFICATION_EMAIL` | (empty) | Admin inbox for notifications |
| `LOGO_URL` | `${APP_URL}/logo.png` | Logo URL for email headers |
| `BIMI_LOGO_URL` | `${APP_URL}/bimi.svg` | Public URL to the BIMI SVG logo |

## Resend Configuration

1. In the [Resend dashboard](https://resend.com/domains), add your domain (`pickamgo.com`).
2. Resend will provide DNS records for SPF, DKIM, and DMARC. Add them to your DNS provider.
3. Wait for DNS propagation (typically 15 minutes to 48 hours).
4. Verify the domain in the Resend dashboard.

## Production Checklist

- [ ] `RESEND_API_KEY` is set to a valid Resend API key (not the development placeholder).
- [ ] All role-based sender addresses (`RESEND_*_EMAIL`) are configured in the Resend dashboard or use the defaults.
- [ ] SPF, DKIM, and DMARC DNS records are configured and passing for `pickamgo.com`.
- [ ] `BIMI_LOGO_URL` points to a publicly accessible HTTPS URL on the same domain as the sending addresses.
- [ ] `public/bimi.svg` is uploaded to your production server at the BIMI URL.
- [ ] BIMI DNS TXT record is added (`default._bimi.pickamgo.com`).
- [ ] (Optional, for Gmail) VMC is obtained and configured.

## Limitations

- **Sender avatar display is controlled by the recipient's email provider.** PickAmGo cannot force the logo to appear in every client.
- **Gmail requires a VMC** for BIMI logos. Without one, Gmail may show a generic avatar or initials.
- **BIMI is not supported by all email clients.** The logo inside the email header remains as a fallback for clients that do not support BIMI.
