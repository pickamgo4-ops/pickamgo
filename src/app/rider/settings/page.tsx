'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Settings, User, Shield, Bell, HelpCircle } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const settingsOptions = [
  { icon: User, title: 'Account Settings', description: 'Update your profile information', href: '/rider/profile' },
  { icon: Shield, title: 'Privacy & Security', description: 'Manage your privacy settings', href: '#' },
  { icon: Bell, title: 'Notification Preferences', description: 'Choose what notifications you receive', href: '#' },
  { icon: HelpCircle, title: 'Help & Support', description: 'Get help with your account', href: '/rider/help' },
]

export default function RiderSettingsPage() {
  const router = useRouter()

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Settings</h1>
          <p className="text-warm-800/60 mt-1">Manage your account settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsOptions.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.title}
                variant="outline"
                className="h-auto p-5 justify-start text-left"
                onClick={() => option.href !== '#' && router.push(option.href)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warm-900 mb-1">{option.title}</h3>
                    <p className="text-sm text-warm-800/60">{option.description}</p>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>
    </RiderSidebar>
  )
}
