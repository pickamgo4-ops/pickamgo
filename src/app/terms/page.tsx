"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "../../components/layout/Header";
import { BottomNav } from "../../components/layout/BottomNav";
import { Button } from "../../components/ui/Button";

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-bold text-warm-900 mb-2">Terms of Service</h1>
          <p className="text-warm-800/60">Last updated: August 2026</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-warm-200 space-y-8 text-warm-800/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">1. What PickAmGo Is</h2>
            <p>
              PickAmGo is a general online marketplace that connects buyers with sellers and service
              providers. Buyers can discover products, services, and shops; sellers can create shops
              and list items; and independent riders can accept delivery requests. PickAmGo
              facilitates these connections but is not a party to the actual transactions between
              buyers, sellers, and riders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">2. Eligibility</h2>
            <p className="mb-3">
              You must be at least 18 years old to use PickAmGo. By using the platform, you
              represent that you are legally capable of entering into binding agreements.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Buyers must be 18 or older.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Sellers must be 18 or older and able to enter into legally binding contracts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Riders must be 18 or older and possess valid identification for verification.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              3. Account Creation and Security
            </h2>
            <p className="mb-3">
              You can create an account using an email and password or through Google Sign-In. You
              are responsible for:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Providing accurate and complete information during registration.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Maintaining the confidentiality of your account credentials.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>All activity that occurs under your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Notifying PickAmGo immediately of unauthorized access.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">4. Guest Checkout</h2>
            <p>
              PickAmGo supports guest checkout for buyers who do not wish to create an account.
              Guest checkout requires a name, phone number, and email address. Guest orders are
              tracked using the provided contact information. Creating an account is optional but
              recommended for order tracking, favorites, and faster checkout.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">5. Buyers and Customers</h2>
            <p className="mb-3">As a buyer on PickAmGo, you agree to:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Provide accurate delivery information.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Pay for orders you place, including applicable delivery fees and taxes.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Complete payment through the available payment methods.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Be available to receive deliveries at the provided address.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Leave honest reviews for products, services, and shops you have purchased or used.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">6. Sellers and Shop Owners</h2>
            <p className="mb-3">
              Sellers are responsible for everything related to their shop and listings:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Providing accurate product descriptions, images, prices, and availability.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Fulfilling orders promptly and communicating with buyers.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Setting appropriate delivery options, fees, and pickup instructions.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Complying with all applicable laws, including product safety and consumer
                  protection laws.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Not listing prohibited, illegal, or misleading products or services.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Handling customer complaints, returns, and refunds in accordance with PickAmGo
                  policies.
                </span>
              </li>
            </ul>
            <p className="mt-3">
              Sellers may be required to complete identity verification before listing products or
              receiving payouts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">7. Riders and Delivery</h2>
            <p className="mb-3">
              Riders are independent contractors, not employees of PickAmGo. Riders agree to:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Complete identity verification (including Ghana Card) before accepting deliveries.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Accept and deliver orders in a safe, timely, and professional manner.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Follow pickup and drop-off instructions provided by sellers and buyers.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Update delivery status accurately through the platform.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Treat customers and sellers with respect.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              8. Orders, Payments, and Fulfillment
            </h2>
            <p className="mb-3">
              Orders are placed through PickAmGo and processed via third-party payment providers
              such as Paystack. Payment methods may include mobile money, card payments, and cash on
              delivery where available.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Orders are confirmed only after successful payment authorization, unless cash on
                  delivery is selected.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Delivery fees are set by sellers and displayed at checkout.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  PickAmGo may charge platform service fees on transactions. These fees are deducted
                  from seller payouts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Sellers and buyers may cancel orders according to the cancellation rules displayed
                  at checkout or communicated through the platform.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              9. Cancellations, Refunds, and Disputes
            </h2>
            <p className="mb-3">
              Cancellation and refund policies vary by seller and delivery method. Buyers and
              sellers should review the specific terms for each order.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Cancellations are subject to seller approval and may incur fees.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Refunds are processed by sellers or through PickAmGo dispute resolution.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Disputes can be opened for orders that involve registered users. Guest orders
                  cannot be disputed through the platform.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  PickAmGo may mediate disputes but does not guarantee any specific outcome.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">10. Delivery Responsibilities</h2>
            <p className="mb-3">
              Delivery is performed by sellers, riders, or third-party delivery partners. Buyers
              must provide accurate delivery addresses. Sellers and riders are responsible for:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Delivering items in the condition they were sold.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Using reasonable care when handling packages.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Updating delivery status accurately.</span>
              </li>
            </ul>
            <p className="mt-3">
              PickAmGo is not responsible for loss, theft, or damage that occurs after delivery is
              marked as complete.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              11. Seller and Rider Payouts and Commissions
            </h2>
            <p className="mb-3">
              PickAmGo deducts platform service fees from seller and rider earnings. Payouts are
              processed through third-party providers such as Paystack. Sellers and riders must
              provide accurate payout method information.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Earnings are calculated based on completed orders and deliveries.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Payout schedules and minimum thresholds may apply.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  PickAmGo is not responsible for delays or failures caused by third-party payout
                  providers.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              12. Prohibited Products, Services, and Activities
            </h2>
            <p className="mb-3">You may not use PickAmGo to list, sell, or promote:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Illegal goods or services.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Counterfeit, stolen, or fraudulent items.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Items that infringe on intellectual property rights.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Dangerous, hazardous, or regulated goods without proper authorization.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Content that is abusive, defamatory, obscene, or discriminatory.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Any activity that violates applicable laws or regulations.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">13. User-Generated Content</h2>
            <p className="mb-3">
              Users may upload images, write reviews, send messages, and create other content. You
              retain ownership of your content but grant PickAmGo a license to use, display, and
              distribute it on the platform. You are responsible for ensuring your content does not
              violate laws or third-party rights.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Reviews must be honest and based on actual experiences.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Images must not contain illegal, offensive, or misleading content.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Messages between users should be respectful and relevant to the platform.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">14. Messaging Between Users</h2>
            <p>
              PickAmGo provides messaging functionality to facilitate communication between buyers,
              sellers, and riders. PickAmGo may monitor messages for safety and compliance purposes
              but does not guarantee the accuracy or legality of user communications. Users should
              not share sensitive personal or financial information through platform messages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              15. Account Suspension and Termination
            </h2>
            <p className="mb-3">
              PickAmGo may suspend or terminate accounts that violate these Terms, engage in
              fraudulent activity, or create risk for other users. Sellers and riders may also be
              suspended for poor performance, policy violations, or failure to complete
              verification.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Accounts may be suspended pending investigation.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Users may request account deletion by contacting support.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Upon termination, access to the platform and certain data may be revoked.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">16. Intellectual Property</h2>
            <p>
              The PickAmGo platform, including its name, logo, design, and code, is owned by
              PickAmGo and protected by applicable intellectual property laws. Users may not copy,
              modify, or distribute platform content without permission. Sellers retain ownership of
              their shop branding and product content but grant PickAmGo a license to display it on
              the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">17. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Use the platform for any unlawful purpose.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Interfere with or disrupt the platform&apos;s functionality.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Attempt to gain unauthorized access to accounts or systems.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Harass, abuse, or harm other users.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  Scrape, crawl, or use automated tools to access the platform without permission.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">18. Third-Party Services</h2>
            <p className="mb-3">PickAmGo integrates with third-party services including:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Paystack</strong> — payment processing and payouts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Resend</strong> — email delivery.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Mapbox</strong> — maps and location services.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Google</strong> — authentication and sign-in.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>Cloudflare R2</strong> — optional file and image storage.
                </span>
              </li>
            </ul>
            <p className="mt-3">
              These services have their own terms and privacy policies. PickAmGo is not responsible
              for third-party service availability or practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              19. Marketplace Disclaimers and Limitation of Liability
            </h2>
            <p className="mb-3">
              PickAmGo is provided on an &quot;as is&quot; basis. We do not guarantee uninterrupted
              or error-free service. To the fullest extent permitted by law, PickAmGo shall not be
              liable for:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Indirect, incidental, special, or consequential damages.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Loss of profits, data, or goodwill.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Actions or omissions of other users, sellers, riders, or third parties.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Disputes between buyers, sellers, and riders.</span>
              </li>
            </ul>
            <p className="mt-3">
              Our total liability to you for any claim arising from these Terms or your use of
              PickAmGo shall not exceed the amount you paid to PickAmGo in the twelve months
              preceding the claim, or GHS 100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">
              20. Transactions Outside the Platform
            </h2>
            <p>
              PickAmGo is designed to facilitate transactions within the platform. If you choose to
              transact outside PickAmGo, you do so at your own risk. PickAmGo cannot assist with
              disputes, refunds, or other issues arising from off-platform transactions. We strongly
              recommend keeping all communication and payments within the platform for your
              protection.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">21. Security</h2>
            <p>
              PickAmGo implements reasonable security measures to protect user data, including
              encrypted authentication and secure API connections. However, no platform is
              completely secure. You are responsible for protecting your account credentials and
              notifying us of any unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">22. Changes to These Terms</h2>
            <p>
              PickAmGo may update these Terms from time to time. Material changes will be
              communicated through the platform or via email. Continued use of the platform after
              changes constitutes acceptance of the updated Terms. We encourage you to review these
              Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">23. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Ghana. Any disputes arising from these Terms
              or your use of PickAmGo shall be resolved in the courts of Ghana, unless otherwise
              agreed by the parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">24. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us through the{" "}
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
              <strong>Note:</strong> This document is a general Terms of Service for PickAmGo. It
              does not constitute legal advice. You should consult a qualified lawyer to review
              these Terms in the context of your specific business and legal requirements,
              especially with respect to Ghanaian consumer protection, e-commerce, and data
              protection laws including the Data Protection Act, 2012 (Act 843).
            </p>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
