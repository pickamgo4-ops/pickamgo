"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "../../components/layout/Header";
import { BottomNav } from "../../components/layout/BottomNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-6 font-medium"
        >
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-warm-900 mb-2">Privacy Policy</h1>
          <p className="text-warm-800/60">Last updated: August 2026</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-warm-200 space-y-8 text-warm-800/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">1. Introduction</h2>
            <p>
              PickAmGo respects your privacy and is committed to protecting your personal data. This
              Privacy Policy explains how we collect, use, store, and protect your information when
              you use our marketplace platform. It applies to all users, including buyers, sellers,
              and riders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information to provide and improve our services:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Account information:</strong> name, email address, phone number, password
                  (hashed), and profile details.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Payment information:</strong> transaction records, payout details, and
                  billing addresses. Full card details are handled by Paystack and are not stored on
                  PickAmGo.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Delivery information:</strong> addresses, delivery instructions, and
                  location data for map and routing services.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Communication data:</strong> messages between users, reviews, and support
                  inquiries.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Device and usage data:</strong> IP address, browser type, device
                  identifiers, and usage analytics.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Location data:</strong> approximate or precise location when you use map
                  features, search for nearby services, or enable location services.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Media files:</strong> product images, profile photos, and other content
                  you upload. These may be stored on Cloudflare R2 or other storage providers.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Create and manage your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Process orders, payments, and deliveries.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Enable messaging, reviews, and other communication features.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Verify identity and prevent fraud.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Send transactional emails such as order confirmations, delivery updates, and
                  password reset links.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Improve platform features, security, and user experience.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Comply with legal obligations and resolve disputes.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              4. How We Share Your Information
            </h2>
            <p className="mb-3">
              PickAmGo shares information only as necessary to operate the platform:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>With other users:</strong> sellers see buyer names and delivery addresses
                  for orders; buyers see seller names and shop details; riders see pickup and
                  drop-off addresses for deliveries.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>With service providers:</strong> Paystack (payments), Resend (email),
                  Mapbox (maps and location), Google (authentication), and storage providers such as
                  Cloudflare R2.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>For legal reasons:</strong> when required by law or to protect the rights
                  and safety of PickAmGo, its users, or others.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>With your consent:</strong> for any other purpose you explicitly agree to.
                </span>
              </li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">5. Cookies and Tracking</h2>
            <p>
              PickAmGo uses cookies and similar technologies to keep you logged in, remember
              preferences, and understand how the platform is used. You can control cookies through
              your browser settings, but disabling cookies may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">6. Data Security</h2>
            <p>
              We implement reasonable security measures including HTTPS encryption, secure API
              design, hashed passwords, and access controls. However, no platform is completely
              secure. We encourage you to use strong passwords and report any suspicious activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">7. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to
              provide services, comply with legal obligations, resolve disputes, and enforce
              agreements. You may request account deletion, after which personal data will be
              deleted or anonymized, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">8. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have rights including:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Accessing the personal data we hold about you.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Correcting inaccurate or incomplete data.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Requesting deletion of your account and personal data.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Objecting to or restricting certain processing.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Exporting your data in a portable format.</span>
              </li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us through the{" "}
              <Link href="/help" className="text-primary hover:underline">
                Help Center
              </Link>{" "}
              or{" "}
              <a href="mailto:support@pickamgo.com" className="text-primary hover:underline">
                support@pickamgo.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">9. Guest Users</h2>
            <p>
              Guest checkout users are identified by the name, phone number, and email address
              provided during checkout. Guest order information is retained for order fulfillment
              and customer support. Guest users can request deletion of their data by contacting
              support with the order details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">10. International Users</h2>
            <p>
              PickAmGo is operated primarily in Ghana. If you access the platform from outside
              Ghana, your data will be transferred to and processed in Ghana and other jurisdictions
              where our service providers operate. By using PickAmGo, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">11. Children&apos;s Privacy</h2>
            <p>
              PickAmGo is not intended for users under 18 years of age. We do not knowingly collect
              personal data from children. If you believe a child has provided information to
              PickAmGo, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes in our practices or legal
              requirements. Material changes will be communicated through the platform or via email.
              Continued use of PickAmGo after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how your data is handled, contact
              us through the{" "}
              <Link href="/help" className="text-primary hover:underline">
                Help Center
              </Link>{" "}
              or email us at{" "}
              <a href="mailto:support@pickamgo.com" className="text-primary hover:underline">
                support@pickamgo.com
              </a>
              .
            </p>
            <p className="mt-3 text-sm text-warm-800/60">
              <strong>Note:</strong> This Privacy Policy is tailored to PickAmGo&apos;s actual
              platform features and data practices. It does not constitute legal advice. You should
              consult a qualified lawyer to review this policy in the context of Ghanaian data
              protection law, including the Data Protection Act, 2012 (Act 843).
            </p>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
