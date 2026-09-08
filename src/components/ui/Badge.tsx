import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'trending' | 'new' | 'deal' | 'verified' | 'delivery' | 'popular' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'default'
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
    trending: 'bg-[var(--color-orange-100)] text-[var(--color-orange-700)]',
    new: 'bg-[var(--color-purple-100)] text-[var(--color-purple-700)]',
    deal: 'bg-[var(--color-success-100)] text-[var(--color-success-700)]',
    verified: 'bg-[var(--color-teal-100)] text-[var(--color-teal-700)]',
    delivery: 'bg-[var(--color-cyan-100)] text-[var(--color-teal-700)]',
    popular: 'bg-[var(--color-pink-100)] text-[var(--color-pink-700)]',
    success: 'bg-[var(--color-success-100)] text-[var(--color-success-700)]',
    warning: 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]',
    danger: 'bg-[var(--color-danger-100)] text-[var(--color-danger-700)]',
    info: 'bg-[var(--color-info-100)] text-[var(--color-info-700)]',
    purple: 'bg-[var(--color-purple-100)] text-[var(--color-purple-700)]',
    teal: 'bg-[var(--color-teal-100)] text-[var(--color-teal-700)]',
    default: 'bg-[var(--warm-100)] text-[color:var(--foreground)]',
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
