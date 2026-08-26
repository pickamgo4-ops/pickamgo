'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink, Flag } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const helpSections = [
  { icon: BookOpen, title: 'Account Help', description: 'Login, signup, profile, and account settings', href: '#account' },
  { icon: MessageCircle, title: 'Order Help', description: 'Placing, tracking, and managing orders', href: '#orders' },
  { icon: Mail, title: 'Payment Help', description: 'Payments, refunds, and payment methods', href: '#payments' },
  { icon: ExternalLink, title: 'Shop & Vendor Help', description: 'Finding shops, products, and vendor issues', href: '#shops' },
  { icon: Flag, title: 'Report a Problem', description: 'Report fraud, harassment, or other issues', href: '/report' },
]

const faqs = [
  { q: 'How do I create an account?', a: 'Click Sign Up in the top right, fill in your details, and verify your email.' },
  { q: 'How do I place an order?', a: 'Browse products, add to cart, and checkout. You can pay via Paystack or Cash on Delivery.' },
  { q: 'How do I track my order?', a: 'Go to Orders and select the order to see real-time tracking updates.' },
  { q: 'How do I message a seller?', a: 'Open any shop or product page and tap Message to start a conversation.' },
  { q: 'How do I report a problem?', a: 'Use the Report a Problem button above or visit /report.' },
  { q: 'How do I reset my password?', a: 'Go to the login page and click Forgot password.' },
]

export default function HelpPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Help & Support
            </h1>
            <p className="text-warm-800/60">Find answers and get support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {helpSections.map((section) => {
            const Icon = section.icon
            return (
              <Card
                key={section.title}
                className="p-5 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => section.href.startsWith('http') || section.href.startsWith('/') ? router.push(section.href) : undefined}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warm-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-warm-800/60">{section.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-warm-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-warm-200 last:border-0 pb-4 last:pb-0">
                <h4 className="font-medium text-warm-900 mb-1">{faq.q}</h4>
                <p className="text-sm text-warm-800/60">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h3 className="font-semibold text-warm-900 mb-2">Contact Support</h3>
          <p className="text-sm text-warm-800/60 mb-4">Can&apos;t find what you need? Reach out to our support team.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button fullWidth icon={<Mail size={18} />} onClick={() => window.location.href = 'mailto:support@pickamgo.com'}>Email Support</Button>
            <Button variant="outline" fullWidth icon={<Flag size={18} />} onClick={() => router.push('/report')}>Report a Problem</Button>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
