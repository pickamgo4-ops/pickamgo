'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, SkipForward, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { sellerTourSteps, SellerTourStep } from './seller-tour-steps'

type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

interface SellerTourProps {
  children: React.ReactNode
}

export default function SellerTour({ children }: SellerTourProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<TourStatus>('NOT_STARTED')
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef(status)

  statusRef.current = status

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const initTour = async () => {
      try {
        const response = await api.get<{ status: TourStatus }>('/seller/tour/status')
        if (response.success && response.data) {
          setStatus(response.data.status)
          if (response.data.status === 'IN_PROGRESS') {
            setIsVisible(true)
          }
        }
      } catch {
        // ignore
      }
    }
    initTour()
  }, [])

  const updateStatus = useCallback(async (newStatus: TourStatus) => {
    setStatus(newStatus)
    try {
      await api.post('/seller/tour/status', { status: newStatus })
    } catch {
      // ignore
    }
  }, [])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setIsVisible(true)
    updateStatus('IN_PROGRESS')
  }, [updateStatus])

  const skipTour = useCallback(() => {
    setIsVisible(false)
    updateStatus('SKIPPED')
  }, [updateStatus])

  const closeTour = useCallback(() => {
    setIsVisible(false)
    updateStatus('COMPLETED')
  }, [updateStatus])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < sellerTourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      closeTour()
    }
  }, [currentStep, closeTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const restartTour = useCallback(() => {
    setCurrentStep(0)
    setIsVisible(true)
    updateStatus('IN_PROGRESS')
  }, [updateStatus])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'Escape') {
        closeTour()
      } else if (e.key === 'ArrowRight') {
        nextStep()
      } else if (e.key === 'ArrowLeft') {
        prevStep()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, closeTour, nextStep, prevStep])

  useEffect(() => {
    if (!isVisible) return

    const step = sellerTourSteps[currentStep]
    if (!step) return

    const findTarget = () => {
      const selector = step.targetSelector
      const target = document.querySelector(selector) as HTMLElement | null
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)
        
        if (isMobile) {
          const sidebar = document.querySelector('[data-mobile-sidebar]')
          if (sidebar && !sidebar.classList.contains('translate-x-0')) {
            setSidebarOpen(true)
            setTimeout(() => {
              const mobileTarget = document.querySelector(selector) as HTMLElement | null
              if (mobileTarget) {
                mobileTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }, 300)
          }
        }
        
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    findTarget()
    const resizeObserver = new ResizeObserver(findTarget)
    resizeObserver.observe(document.body)
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget, true)
    }
  }, [isVisible, currentStep, isMobile])

  const currentStepData = sellerTourSteps[currentStep]
  const progress = ((currentStep + 1) / sellerTourSteps.length) * 100

  const renderWelcomeModal = () => {
    if (status !== 'NOT_STARTED' || isVisible) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
          <button
            onClick={skipTour}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-warm-100 text-warm-800/60 hover:text-warm-900"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">
              Welcome to your PickAmGo Seller Dashboard
            </h2>
            <p className="text-warm-800/60 text-sm">
              Let&apos;s take a quick tour of your seller tools so you know where everything is and how to manage your shop.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={startTour}
              className="w-full bg-primary text-white rounded-xl py-3 px-4 font-medium hover:bg-primary/90 transition-colors"
            >
              Start Tour
            </button>
            <button
              onClick={skipTour}
              className="w-full border border-warm-200 text-warm-800 rounded-xl py-3 px-4 font-medium hover:bg-warm-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderTourOverlay = () => {
    if (!isVisible || !currentStepData || !targetRect) return null

    const tooltipStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 90,
      maxWidth: '320px',
      width: 'calc(100vw - 32px)',
    }

    if (isMobile) {
      tooltipStyle.bottom = '16px'
      tooltipStyle.left = '16px'
      tooltipStyle.right = '16px'
      tooltipStyle.top = 'auto'
      tooltipStyle.maxWidth = 'none'
    } else {
      const tooltipWidth = 320
      const gap = 12
      let left = targetRect.right + gap
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = targetRect.left - tooltipWidth - gap
      }
      if (left < 16) {
        left = 16
      }
      let top = targetRect.top + (targetRect.height / 2) - 100
      top = Math.max(16, Math.min(top, window.innerHeight - 250))
      tooltipStyle.left = `${left}px`
      tooltipStyle.top = `${top}px`
    }

    return (
      <>
        <div className="fixed inset-0 z-[80] bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 z-[85] pointer-events-none" aria-hidden="true">
          {!isMobile && targetRect && (
            <div
              className="absolute rounded-lg"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div
          ref={tooltipRef}
          className="fixed z-[90] bg-white rounded-xl shadow-2xl border border-warm-200 p-5"
          style={tooltipStyle}
          role="dialog"
          aria-modal="true"
          aria-label={`Tour step: ${currentStepData.title}`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display font-bold text-warm-900 text-lg">{currentStepData.title}</h3>
              <p className="text-xs text-warm-800/50 mt-0.5">
                Step {currentStep + 1} of {sellerTourSteps.length}
              </p>
            </div>
            <button
              onClick={closeTour}
              className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-800/60 hover:text-warm-900 flex-shrink-0"
              aria-label="Close tour"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-warm-800/80 mb-4 leading-relaxed">{currentStepData.description}</p>

          <div className="mb-3 h-1.5 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="p-2 rounded-xl border border-warm-200 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous step"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex gap-1">
              {sellerTourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'bg-primary w-4' : 'bg-warm-200 w-1.5'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
              aria-label={currentStep === sellerTourSteps.length - 1 ? 'Finish tour' : 'Next step'}
            >
              {currentStep === sellerTourSteps.length - 1 ? (
                <CheckCircle2 size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-xs text-warm-800/60 hover:text-warm-900 flex items-center gap-1"
            >
              <SkipForward size={14} />
              Skip Tour
            </button>
            <span className="text-xs text-warm-800/50">
              {currentStep + 1} / {sellerTourSteps.length}
            </span>
          </div>
        </div>
      </>
    )
  }

  const renderCompletionScreen = () => {
    if (!isVisible || currentStep < sellerTourSteps.length - 1) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative">
          <button
            onClick={closeTour}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-warm-100 text-warm-800/60 hover:text-warm-900"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>

          <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">
            You&apos;re all set! 🎉
          </h2>
          <p className="text-warm-800/60 text-sm mb-6">
            You now know where the main seller tools are. Start adding products, customizing your shop and growing your business on PickAmGo.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/seller/products/new')}
              className="w-full bg-primary text-white rounded-xl py-3 px-4 font-medium hover:bg-primary/90 transition-colors"
            >
              Start Selling
            </button>
            <button
              onClick={() => router.push('/seller/shop')}
              className="w-full border border-warm-200 text-warm-800 rounded-xl py-3 px-4 font-medium hover:bg-warm-50 transition-colors"
            >
              View My Shop
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {renderWelcomeModal()}
      {renderTourOverlay()}
      {renderCompletionScreen()}
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-[95]">
          <button
            onClick={skipTour}
            className="bg-white border border-warm-200 rounded-xl shadow-lg px-4 py-2.5 text-sm font-medium text-warm-800 hover:bg-warm-50 flex items-center gap-2"
          >
            <SkipForward size={16} />
            Skip Tour
          </button>
        </div>
      )}
      {children}
    </>
  )
}
