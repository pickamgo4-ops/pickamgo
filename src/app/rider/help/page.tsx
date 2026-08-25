'use client'

import React from 'react'
import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const helpTopics = [
  { icon: BookOpen, title: 'Getting Started', description: 'Learn how to start accepting deliveries', href: '#' },
  { icon: MessageCircle, title: 'Delivery Guidelines', description: 'How to complete deliveries successfully', href: '#' },
  { icon: Mail, title: 'Contact Support', description: 'Get in touch with our support team', href: '#' },
  { icon: ExternalLink, title: 'Rider Terms', description: 'Read our rider terms and guidelines', href: '#' },
]

export default function RiderHelpPage() {
  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Help & Support</h1>
          <p className="text-warm-800/60 mt-1">Find answers and get support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {helpTopics.map((topic) => {
            const Icon = topic.icon
            return (
              <Card key={topic.title} className="p-5 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-warm-800/60" />
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
              { q: 'How do I accept a delivery?', a: 'Go to Available Deliveries and click the Accept button on any delivery.' },
              { q: 'How do I update delivery status?', a: 'Go to Active Delivery and use the action buttons to update the status as you progress.' },
              { q: 'When do I get paid?', a: 'Earnings are paid weekly to your registered bank account.' },
              { q: 'What if a customer is not available?', a: 'Contact the customer and if unreachable, mark the delivery as an issue in the app.' },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-warm-200 last:border-0 pb-4 last:pb-0">
                <h4 className="font-medium text-warm-900 mb-1">{faq.q}</h4>
                <p className="text-sm text-warm-800/60">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </RiderSidebar>
  )
}
