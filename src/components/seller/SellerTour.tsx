'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, SkipForward, CheckCircle2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { sellerTourSteps, SellerTourStep, tourGroups, getFirstStepInGroup } from './seller-tour-steps'

type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

interface SellerTourProps {
  children: React.ReactNode
}

const SELLER_TOUR_KEY = 'seller-tour-current-step'
const SELLER_TOUR_INTRO_KEY = 'seller-tour-intro-shown'

export default function SellerTour({ children }: SellerTourProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<TourStatus>('NOT_STARTED')
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showGroupIntro, setShowGroupIntro] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef(status)
  const welcomeRef = useRef<HTMLDivElement>(null)
  const completionRef = useRef<HTMLDivElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)
  const announcerRef = useRef<HTMLDivElement>(null)

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
          const nextStatus = response.data.status
          const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as { id?: string } | null
          const introKey = `${SELLER_TOUR_INTRO_KEY}:${storedUser?.id || 'current'}`
          if (nextStatus === 'NOT_STARTED') {
            if (localStorage.getItem(introKey) === 'true') {
              setStatus('SKIPPED')
              return
            }
            localStorage.setItem(introKey, 'true')
            setStatus('IN_PROGRESS')
            setCurrentStep(0)
            setIsVisible(true)
            localStorage.setItem(SELLER_TOUR_KEY, '0')
            await api.post('/seller/tour/status', { status: 'IN_PROGRESS' })
          } else {
            setStatus(nextStatus)
          }
          if (nextStatus === 'IN_PROGRESS') {
            localStorage.setItem(introKey, 'true')
            const savedStep = localStorage.getItem(SELLER_TOUR_KEY)
            setCurrentStep(savedStep ? parseInt(savedStep, 10) : 0)
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

  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message
    }
  }, [])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setIsVisible(true)
    localStorage.setItem(SELLER_TOUR_KEY, '0')
    updateStatus('IN_PROGRESS')
    announce('Tour started. Step 1 of ' + sellerTourSteps.length + ': ' + sellerTourSteps[0].title)
  }, [updateStatus, announce])

  const skipTour = useCallback(() => {
    setIsVisible(false)
    localStorage.removeItem(SELLER_TOUR_KEY)
    updateStatus('SKIPPED')
    announce('Tour skipped')
  }, [updateStatus, announce])

  const closeTour = useCallback(() => {
    setIsVisible(false)
    localStorage.removeItem(SELLER_TOUR_KEY)
    updateStatus('COMPLETED')
    announce('Tour completed')
  }, [updateStatus, announce])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    localStorage.setItem(SELLER_TOUR_KEY, step.toString())
  }, [])

  const nextStep = useCallback(() => {
    const nextIndex = currentStep + 1
    if (nextIndex < sellerTourSteps.length) {
      const currentStepData = sellerTourSteps[currentStep]
      const nextStepData = sellerTourSteps[nextIndex]
      
      if (currentStepData.group !== nextStepData.group && nextStepData.groupTitle) {
        setShowGroupIntro(true)
        setTimeout(() => {
          goToStep(nextIndex)
          setShowGroupIntro(false)
        }, 2000)
      } else {
        goToStep(nextIndex)
      }
    } else {
      closeTour()
    }
  }, [currentStep, goToStep, closeTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1
      goToStep(prevIndex)
    }
  }, [currentStep, goToStep])

  const restartTour = useCallback(() => {
    setCurrentStep(0)
    setIsVisible(true)
    localStorage.setItem(SELLER_TOUR_KEY, '0')
    updateStatus('IN_PROGRESS')
    announce('Tour restarted. Step 1 of ' + sellerTourSteps.length + ': ' + sellerTourSteps[0].title)
  }, [updateStatus, announce])

  const handleGroupIntroClose = useCallback(() => {
    setShowGroupIntro(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'Escape') {
        if (showGroupIntro) {
          handleGroupIntroClose()
        } else {
          closeTour()
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevStep()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, showGroupIntro, closeTour, nextStep, prevStep, handleGroupIntroClose])

  useEffect(() => {
    if (!isVisible || showGroupIntro) return

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
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        setTargetRect(null)
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
  }, [isVisible, currentStep, isMobile, showGroupIntro])

  useEffect(() => {
    if (!isVisible || showGroupIntro) return
    const step = sellerTourSteps[currentStep]
    if (step) {
      announce('Step ' + (currentStep + 1) + ' of ' + sellerTourSteps.length + ': ' + step.title + '. ' + step.description)
    }
  }, [isVisible, currentStep, showGroupIntro, announce])

  const currentStepData = sellerTourSteps[currentStep]
  const progress = ((currentStep + 1) / sellerTourSteps.length) * 100

  const currentGroup = useMemo(() => {
    if (!currentStepData?.group) return null
    return tourGroups.find(g => g.id === currentStepData.group)
  }, [currentStepData])

  const getGroupProgress = useMemo(() => {
    if (!currentStepData?.group) return { current: 0, total: 0, percentage: 0 }
    const groupSteps = sellerTourSteps.filter(s => s.group === currentStepData.group)
    const currentInGroup = groupSteps.findIndex(s => s.id === currentStepData.id) + 1
    return {
      current: currentInGroup,
      total: groupSteps.length,
      percentage: (currentInGroup / groupSteps.length) * 100
    }
  }, [currentStepData])

  const renderAnnouncer = () => (
    <div
      ref={announcerRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )

  const renderWelcomeModal = () => {
    if (status !== 'NOT_STARTED' || isVisible) return null

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div
          ref={welcomeRef}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl relative dark:bg-warm-900 sm:p-8"
        >
          <button
            onClick={skipTour}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-800/60 dark:text-warm-200/60 hover:text-warm-900 dark:hover:text-warm-100 transition-colors"
            aria-label="Close welcome modal"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h2 id="welcome-title" className="font-display text-2xl font-bold text-warm-900 dark:text-white mb-2">
              Welcome to your PickAmGo Seller Dashboard
            </h2>
            <p className="text-warm-800/60 dark:text-warm-200/60 text-sm">
              Let&apos;s take a quick tour of your seller tools so you know where everything is and how to manage your shop.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={startTour}
              className="w-full bg-primary dark:bg-primary text-white rounded-xl py-3 px-4 font-medium hover:bg-primary/90 dark:hover:bg-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Start Tour
            </button>
            <button
              onClick={skipTour}
              className="w-full border border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200 rounded-xl py-3 px-4 font-medium hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-400 focus:ring-offset-2"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderGroupIntroOverlay = () => {
    if (!showGroupIntro || !currentGroup || !currentStepData) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
        <div
          className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-warm-900 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-intro-title"
        >
          <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary dark:text-primary-light" />
          </div>
          <h2 id="group-intro-title" className="font-display text-xl font-bold text-warm-900 dark:text-white mb-2">
            {currentGroup.title}
          </h2>
          <p className="text-warm-800/60 dark:text-warm-200/60 text-sm mb-6">
            {currentGroup.description}
          </p>
          <div className="h-1.5 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary dark:bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-warm-800/50 dark:text-warm-200/50">
            {currentStep + 1} of {sellerTourSteps.length} steps
          </p>
        </div>
      </div>
    )
  }

  const renderTourOverlay = () => {
    if (!isVisible || !currentStepData || !targetRect || showGroupIntro) return null

    const tooltipStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 90,
      maxWidth: isMobile ? 'none' : '360px',
      width: isMobile ? 'calc(100vw - 32px)' : undefined,
    }

    if (isMobile) {
      tooltipStyle.bottom = '16px'
      tooltipStyle.left = '16px'
      tooltipStyle.right = '16px'
      tooltipStyle.top = 'auto'
    } else {
      const tooltipWidth = 360
      const gap = 16
      let left = targetRect.right + gap
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = targetRect.left - tooltipWidth - gap
      }
      if (left < 16) {
        left = targetRect.left
        tooltipStyle.top = `${targetRect.bottom + gap}px`
      } else {
        let top = targetRect.top + (targetRect.height / 2) - 120
        top = Math.max(16, Math.min(top, window.innerHeight - 280))
        tooltipStyle.left = `${left}px`
        tooltipStyle.top = `${top}px`
      }
    }

    return (
      <>
        <div className="fixed inset-0 z-[80] bg-black/40 dark:bg-black/60" aria-hidden="true" />
        <div className="fixed inset-0 z-[85] pointer-events-none" aria-hidden="true">
          {!isMobile && targetRect && (
            <div
              className="absolute rounded-xl bg-white dark:bg-warm-800"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                outline: '3px solid rgb(var(--color-primary) / 1)',
                outlineOffset: '2px',
              }}
            />
          )}
        </div>

        <div
          ref={tooltipRef}
          className="fixed z-[90] max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white dark:bg-warm-900 rounded-xl shadow-2xl border border-warm-200 dark:border-warm-700 p-4 sm:p-5"
          style={tooltipStyle}
          role="dialog"
          aria-modal="true"
          aria-label={`Tour step: ${currentStepData.title}`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              {currentGroup && (
                <p className="text-xs font-medium text-primary dark:text-primary-light mb-1">
                  {currentGroup.title}
                </p>
              )}
              <h3 className="font-display font-bold text-warm-900 dark:text-white text-lg">
                {currentStepData.title}
                {currentStepData.optional && (
                  <span className="ml-2 text-xs font-normal text-warm-600 dark:text-warm-400">
                    (Optional)
                  </span>
                )}
              </h3>
              <p className="text-xs text-warm-800/50 dark:text-warm-200/50 mt-0.5">
                Step {currentStep + 1} of {sellerTourSteps.length}
                {currentGroup && (
                  <span className="ml-1">
                    ({getGroupProgress.current}/{getGroupProgress.total})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={closeTour}
              className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-800/60 dark:text-warm-200/60 hover:text-warm-900 dark:hover:text-warm-100 flex-shrink-0 transition-colors"
              aria-label="Close tour"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-warm-800/80 dark:text-warm-200/80 mb-4 leading-relaxed">
            {currentStepData.description}
          </p>

          <div className="mb-3 h-1.5 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary dark:bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="p-2 rounded-xl border border-warm-200 dark:border-warm-700 hover:bg-warm-50 dark:hover:bg-warm-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-warm-400"
              aria-label="Previous step"
            >
              <ChevronLeft size={18} className="text-warm-700 dark:text-warm-200" />
            </button>

            <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
              {sellerTourSteps.slice(Math.max(0, currentStep - 2), currentStep + 3).map((_, idx) => {
                const actualIdx = Math.max(0, currentStep - 2) + idx
                return (
                  <div
                    key={actualIdx}
                    className={`h-1.5 rounded-full transition-all ${
                      actualIdx === currentStep
                        ? 'bg-primary dark:bg-primary-light w-4'
                        : actualIdx < currentStep
                        ? 'bg-warm-300 dark:bg-warm-600 w-1.5'
                        : 'bg-warm-200 dark:bg-warm-700 w-1.5'
                    }`}
                  />
                )
              })}
            </div>

            <button
              onClick={nextStep}
              className="p-2 rounded-xl bg-primary dark:bg-primary text-white hover:bg-primary/90 dark:hover:bg-primary/80 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
              className="text-xs text-warm-800/60 dark:text-warm-200/60 hover:text-warm-900 dark:hover:text-warm-100 flex items-center gap-1 transition-colors"
            >
              <SkipForward size={14} />
              Skip Tour
            </button>
            <span className="text-xs text-warm-800/50 dark:text-warm-200/50">
              Press ← → to navigate
            </span>
          </div>
        </div>
      </>
    )
  }

  const renderCompletionScreen = () => {
    if (!isVisible || currentStep < sellerTourSteps.length - 1 || showGroupIntro) return null

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-title"
      >
        <div
          ref={completionRef}
          className="bg-white dark:bg-warm-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative"
        >
          <button
            onClick={closeTour}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-800/60 dark:text-warm-200/60 hover:text-warm-900 dark:hover:text-warm-100 transition-colors"
            aria-label="Close completion screen"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600 dark:text-green-500" />
          </div>

          <h2 id="completion-title" className="font-display text-2xl font-bold text-warm-900 dark:text-white mb-2">
            You&apos;re all set! 🎉
          </h2>
          <p className="text-warm-800/60 dark:text-warm-200/60 text-sm mb-6">
            You now know where the main seller tools are. Start adding products, customizing your shop and growing your business on PickAmGo.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/seller/products/new')}
              className="w-full bg-primary dark:bg-primary text-white rounded-xl py-3 px-4 font-medium hover:bg-primary/90 dark:hover:bg-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Start Selling
            </button>
            <button
              onClick={() => router.push('/seller/shop')}
              className="w-full border border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200 rounded-xl py-3 px-4 font-medium hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-400 focus:ring-offset-2"
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
      {renderAnnouncer()}
      {renderWelcomeModal()}
      {renderGroupIntroOverlay()}
      {renderTourOverlay()}
      {renderCompletionScreen()}
      {isVisible && !showGroupIntro && (
        <div className="fixed bottom-4 right-4 z-[95]">
          <button
            ref={skipButtonRef}
            onClick={skipTour}
            className="bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-xl shadow-lg px-4 py-2.5 text-sm font-medium text-warm-800 dark:text-warm-200 hover:bg-warm-50 dark:hover:bg-warm-700 flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-400"
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

export function useSellerTour() {
  const restartTour = useCallback(async () => {
    try {
      await api.post('/seller/tour/status', { status: 'IN_PROGRESS' })
      localStorage.setItem(SELLER_TOUR_KEY, '0')
      window.location.reload()
    } catch {
      // ignore
    }
  }, [])

  return { restartTour }
}
