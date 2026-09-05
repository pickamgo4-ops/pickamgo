'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Shield, Bell, Lock, Wallet, Globe, FileText,
  LogOut, Moon, Smartphone
} from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SETTINGS_SECTIONS } from '@/lib/rider-constants'

const settingsRouteMap: Record<string, string> = {
  account: '/rider/profile',
  security: '/rider/settings#security',
  notifications: '/rider/notifications',
  privacy: '/rider/settings#privacy',
  payout: '/rider/payouts',
  language: '/rider/settings#language',
  terms: '/rider/terms',
}

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
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon
            const route = settingsRouteMap[section.id]
            return (
              <Button
                key={section.id}
                variant="outline"
                className="h-auto p-5 justify-start text-left"
                onClick={() => router.push(route)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-warm-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-warm-800/60">{section.description}</p>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>

        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">Account</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left rounded-xl hover:bg-warm-50 transition-colors">
              <div className="flex items-center gap-3">
                <Moon size={18} className="text-warm-800/60" />
                <span className="text-sm text-warm-900">Dark Mode</span>
              </div>
              <span className="text-xs text-warm-800/50">Off</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left rounded-xl hover:bg-warm-50 transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-warm-800/60" />
                <span className="text-sm text-warm-900">Push Notifications</span>
              </div>
              <span className="text-xs text-warm-800/50">On</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.dispatchEvent(new Event('auth-changed'))
                router.replace('/auth/login')
              }}
              className="w-full flex items-center justify-between p-3 text-left rounded-xl hover:bg-red-50 transition-colors text-red-600"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                <span className="text-sm font-medium">Log out</span>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </RiderSidebar>
  )
}
