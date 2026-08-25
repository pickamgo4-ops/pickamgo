'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-6 font-medium">
          <ArrowLeft size={18} />
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-warm-900 mb-2">Privacy Policy</h1>
          <p className="text-warm-800/60">Last updated: August 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-warm-200 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">1. Introduction</h2>
            <p className="text-warm-800/80 leading-relaxed">
              PickAmGo ("we", "us", "our", or "Company") operates the PickAmGo platform. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">2. Information Collection and Use</h2>
            <p className="text-warm-800/80 leading-relaxed mb-4">
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>

            <h3 className="text-lg font-semibold text-warm-900 mb-2">Types of Data Collected:</h3>
            <ul className="space-y-3 ml-4">
              {[
                {
                  title: 'Personal Data',
                  items: ['Email address', 'First name and last name', 'Phone number', 'Address, State, Province, ZIP/Postal code, City', 'Cookies and Usage Data']
                },
                {
                  title: 'Usage Data',
                  items: ['Pages visited', 'Time and date of visits', 'Time spent on pages', 'Device information', 'IP address']
                },
                {
                  title: 'Location Data',
                  items: ['City and region information', 'Delivery location preferences', 'Precise location (with your consent)']
                }
              ].map((category, i) => (
                <li key={i} className="text-warm-800/80">
                  <span className="font-semibold text-warm-900">{category.title}:</span>
                  <ul className="mt-2 ml-4 space-y-1">
                    {category.items.map((item, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">3. Use of Data</h2>
            <p className="text-warm-800/80 leading-relaxed mb-3">
              PickAmGo uses the collected data for various purposes:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                'To provide and maintain our Service',
                'To notify you about changes to our Service',
                'To allow you to participate in interactive features of our Service when you choose to do so',
                'To provide customer support',
                'To gather analysis or valuable information so that we can improve our Service',
                'To monitor the usage of our Service',
                'To detect, prevent and address technical issues',
                'To provide you with news, special offers and general information about other goods, services and events which we offer',
              ].map((item, i) => (
                <li key={i} className="text-warm-800/80 flex gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">4. Security of Data</h2>
            <p className="text-warm-800/80 leading-relaxed">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security. We use industry-standard encryption and security protocols to protect your information.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">5. Your Rights</h2>
            <p className="text-warm-800/80 leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                'Access the personal data we hold about you',
                'Request correction of inaccurate personal data',
                'Request deletion of your personal data',
                'Opt-out of marketing communications',
                'Data portability - to receive your data in a structured, commonly used format',
                'Withdraw consent at any time',
              ].map((item, i) => (
                <li key={i} className="text-warm-800/80 flex gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">6. Cookies</h2>
            <p className="text-warm-800/80 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">7. Service Providers</h2>
            <p className="text-warm-800/80 leading-relaxed">
              We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your personal data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">8. Links to Other Sites</h2>
            <p className="text-warm-800/80 leading-relaxed">
              Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">9. Children's Privacy</h2>
            <p className="text-warm-800/80 leading-relaxed">
              Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from children under 18. If we become aware that a child under 18 has provided us with personal data, we immediately delete this from our servers. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us immediately.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-warm-800/80 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">11. Contact Us</h2>
            <p className="text-warm-800/80 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 ml-4 space-y-1 text-warm-800/80">
              <p><strong>Email:</strong> privacy@pickamgo.com</p>
              <p><strong>Support:</strong> support@pickamgo.com</p>
              <p><strong>Address:</strong> PickAmGo Support, Ghana</p>
            </div>
          </section>

          {/* CTA */}
          <div className="pt-6 border-t border-warm-200">
            <p className="text-sm text-warm-800/60 mb-4">
              By using our Service, you acknowledge that you have read and understood our Privacy Policy.
            </p>
            <Link href="/">
              <Button fullWidth>Back to Home</Button>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
