'use client'

import React, { useState } from 'react'
import { HelpCircle, ExternalLink } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { HELP_TOPICS, HELP_FAQS } from '@/lib/rider-constants'

export default function RiderHelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Help & Support</h1>
          <p className="text-warm-800/60 mt-1">Find answers and get support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HELP_TOPICS.map((topic) => {
            const Icon = topic.icon
            return (
              <Card key={topic.title} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-warm-800" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-warm-900 mb-1">{topic.title}</h3>
                    <p className="text-sm text-warm-800/60">{topic.description}</p>
                  </div>
                  {topic.href && topic.href !== '#' && (
                    <ExternalLink size={16} className="text-warm-800/50" />
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {HELP_FAQS.map((faq, idx) => (
              <div key={idx} className="border border-warm-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-warm-900 hover:bg-warm-50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <span className="text-warm-800/50">{expandedFaq === idx ? '−' : '+'}</span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-warm-800/70 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </RiderSidebar>
  )
}
