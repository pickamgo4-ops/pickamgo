import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'trending' | 'new' | 'deal' | 'verified' | 'delivery' | 'popular' | 'default'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variants = {
    trending: 'bg-orange-100 text-orange-700',
    new: 'bg-blue-100 text-blue-700',
    deal: 'bg-green-100 text-green-700',
    verified: 'bg-emerald-100 text-emerald-700',
    delivery: 'bg-purple-100 text-purple-700',
    popular: 'bg-pink-100 text-pink-700',
    default: 'bg-warm-100 text-warm-800',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-semibold rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
