'use client'

import React from 'react'

interface MotionSystemProps {
  children: React.ReactNode
  className?: string
}

export function MotionSystem({ children, className = '' }: MotionSystemProps) {
  return (
    <div className={`motion-safe-only ${className}`}>
      {children}
    </div>
  )
}
