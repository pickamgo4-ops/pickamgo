'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-bold text-warm-900 mb-2">Terms of Service</h1>
          <p className="text-warm-800/60">Last updated: August 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-warm-200 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-warm-800/80 leading-relaxed">
              By accessing and using the PickAmGo platform (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">2. Use License</h2>
            <p className="text-warm-800/80 leading-relaxed mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software) on PickAmGo's platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                'Modifying or copying the materials',
                'Using the materials for any commercial purpose or for any public display',
                'Attempting to decompile or reverse engineer any software contained on the platform',
                'Removing any copyright or other proprietary notations from the materials',
                'Transferring the materials to another person or "mirroring" the materials on any other server',
                'Violating any applicable laws or regulations',
              ].map((item, i) => (
                <li key={i} className="text-warm-800/80 flex gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">3. Disclaimer</h2>
            <p className="text-warm-800/80 leading-relaxed">
              The materials on PickAmGo's platform are provided on an 'as is' basis. PickAmGo makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">4. Limitations</h2>
            <p className="text-warm-800/80 leading-relaxed">
              In no event shall PickAmGo or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on PickAmGo's platform, even if PickAmGo or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">5. Accuracy of Materials</h2>
            <p className="text-warm-800/80 leading-relaxed">
              The materials appearing on PickAmGo's platform could include technical, typographical, or photographic errors. PickAmGo does not warrant that any of the materials on the platform are accurate, complete, or current. PickAmGo may make changes to the materials contained on its platform at any time without notice.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">6. Links</h2>
            <p className="text-warm-800/80 leading-relaxed">
              PickAmGo has not reviewed all of the sites linked to its platform and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by PickAmGo of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">7. Modifications</h2>
            <p className="text-warm-800/80 leading-relaxed">
              PickAmGo may revise these terms of service for its platform at any time without notice. By using this platform, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">8. Governing Law</h2>
            <p className="text-warm-800/80 leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of Ghana, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">9. User Responsibilities</h2>
            <p className="text-warm-800/80 leading-relaxed mb-3">
              As a user of PickAmGo, you agree to:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                'Provide accurate and complete information during registration',
                'Maintain the confidentiality of your account credentials',
                'Comply with all applicable laws and regulations',
                'Not engage in fraudulent or deceptive activities',
                'Treat other users and service providers with respect',
                'Not attempt to interfere with the platform\'s functionality',
              ].map((item, i) => (
                <li key={i} className="text-warm-800/80 flex gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-warm-900 mb-3">10. Contact Us</h2>
            <p className="text-warm-800/80 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at support@pickamgo.com or through our platform's help section.
            </p>
          </section>

          {/* CTA */}
          <div className="pt-6 border-t border-warm-200">
            <p className="text-sm text-warm-800/60 mb-4">
              By continuing to use our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <Link href="/">
              <Button fullWidth>Accept & Continue</Button>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
