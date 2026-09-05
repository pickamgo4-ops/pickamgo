'use client'

import React from 'react'
import { FileText, Shield, BookOpen, ExternalLink } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Card } from '@/components/ui/Card'

export default function RiderTermsPage() {
  return (
    <RiderSidebar>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Terms & Policies</h1>
          <p className="text-warm-800/60 mt-1">Legal documents for PickAmGo Rider platform</p>
        </div>

        <div className="grid gap-4">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-warm-900 mb-1">
                  Rider Terms of Service
                </h3>
                <p className="text-sm text-warm-800/60 mb-3">
                  The terms and conditions for using the PickAmGo rider platform, including delivery obligations, conduct policies, and account management.
                </p>
                <a
                  href="#"
                  className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                >
                  Read Terms <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-warm-900 mb-1">
                  Privacy Policy
                </h3>
                <p className="text-sm text-warm-800/60 mb-3">
                  How PickAmGo collects, uses, and protects your personal information as a rider on our platform.
                </p>
                <a
                  href="#"
                  className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                >
                  Read Privacy Policy <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-warm-900 mb-1">
                  Delivery Guidelines
                </h3>
                <p className="text-sm text-warm-800/60 mb-3">
                  Best practices for handling orders, customer interactions, and completing deliveries safely and efficiently.
                </p>
                <a
                  href="#"
                  className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                >
                  Read Guidelines <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </RiderSidebar>
  )
}
