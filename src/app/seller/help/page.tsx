'use client'

import React from 'react'
import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const helpTopics = [
  { icon: BookOpen, title: 'Getting Started', description: 'Learn how to set up your shop and start selling', href: '#' },
  { icon: MessageCircle, title: 'Managing Orders', description: 'How to accept, prepare, and deliver orders', href: '#' },
  { icon: Mail, title: 'Contact Support', description: 'Get in touch with our support team', href: '#' },
  { icon: ExternalLink, title: 'Seller Guidelines', description: 'Read our seller terms and guidelines', href: '#' },
]

export default function SellerHelpPage() {
  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Help & Support</h1>
          <p className="text-warm-800/60 mt-1">Find answers and get support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {helpTopics.map((topic) => {
            const Icon = topic.icon
            return (
              <Card key={topic.title} className="p-5 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warm-900 mb-1">{topic.title}</h3>
                    <p className="text-sm text-warm-800/60">{topic.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-warm-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'How do I add products to my shop?', a: 'Go to Products > Add Product to create your first listing.' },
              { q: 'How do I process an order?', a: 'Go to Orders, find the order, and use the action buttons to update its status.' },
              { q: 'How do I withdraw my earnings?', a: 'Earnings are automatically transferred to your registered bank account weekly.' },
              { q: 'How do I get verified?', a: 'Go to Verification and submit your phone and business details for review. Ghana Card upload is not required for sellers.' },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-warm-200 last:border-0 pb-4 last:pb-0">
                <h4 className="font-medium text-warm-900 mb-1">{faq.q}</h4>
                <p className="text-sm text-warm-800/60">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SellerSidebar>
  )
}
