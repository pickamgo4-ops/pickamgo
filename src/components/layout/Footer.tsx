'use client'

import React from 'react'
import Link from 'next/link'
import { Store, Bike, Search, User, Mail, HelpCircle, FileText, Shield } from 'lucide-react'

const footerLinks = [
  {
    title: 'Marketplace',
    links: [
      { href: '/discover', label: 'Browse Shops', icon: Search },
      { href: '/auth/signup', label: 'Sign Up', icon: User },
      { href: '/auth/login', label: 'Login', icon: User },
      { href: '/help', label: 'Help Center', icon: HelpCircle },
    ],
  },
  {
    title: 'For Sellers',
    links: [
      { href: '/seller/onboarding', label: 'Create a Shop', icon: Store },
      { href: '/seller/shop/create', label: 'Open a Store', icon: Store },
    ],
  },
  {
    title: 'For Riders',
    links: [
      { href: '/rider/verification', label: 'Become a Rider', icon: Bike },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service', icon: FileText },
      { href: '/privacy', label: 'Privacy Policy', icon: Shield },
    ],
  },
]

export function Footer() {
  return (
    <footer className="w-full bg-warm-900 text-warm-100 mt-auto shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-display font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => {
                  const Icon = link.icon
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-warm-100/80 hover:text-white transition-colors"
                      >
                        <Icon size={16} />
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-warm-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/logo.png"
                alt="PickAmGo"
                className="h-8 w-8 rounded-lg object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  if (!target.src.endsWith('/logo.jpg')) {
                    target.src = '/logo.jpg'
                  }
                }}
              />
              <span className="font-display font-bold text-white">PickAmGo</span>
            </div>
            <p className="text-xs text-warm-100/60 italic">Where Every Pick Finds You</p>
          </div>
          <p className="text-sm text-warm-100/60">
            &copy; {new Date().getFullYear()} PickAmGo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
