import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'purple' | 'teal' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/30'

  const variants = {
    primary: 'bg-[var(--color-primary-600)] text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--color-primary-700)] hover:shadow-xl hover:shadow-blue-500/25',
    secondary: 'bg-[var(--surface-alt)] text-[color:var(--foreground)] border border-[var(--border)] hover:bg-[var(--warm-100)]',
    success: 'bg-[var(--color-success-600)] text-white shadow-lg shadow-green-500/20 hover:bg-[var(--color-success-700)] hover:shadow-xl hover:shadow-green-500/25',
    warning: 'bg-[var(--color-warning-500)] text-white shadow-lg shadow-amber-400/20 hover:bg-[var(--color-warning-600)] hover:shadow-xl hover:shadow-amber-400/25',
    danger: 'bg-[var(--color-danger-600)] text-white shadow-lg shadow-red-500/20 hover:bg-[var(--color-danger-700)] hover:shadow-xl hover:shadow-red-500/25',
    info: 'bg-[var(--color-info-600)] text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--color-info-700)] hover:shadow-xl hover:shadow-blue-500/25',
    orange: 'bg-[var(--color-orange-600)] text-white shadow-lg shadow-orange-500/20 hover:bg-[var(--color-orange-700)] hover:shadow-xl hover:shadow-orange-500/25',
    purple: 'bg-[var(--color-purple-600)] text-white shadow-lg shadow-purple-500/20 hover:bg-[var(--color-purple-700)] hover:shadow-xl hover:shadow-purple-500/25',
    teal: 'bg-[var(--color-teal-600)] text-white shadow-lg shadow-teal-500/20 hover:bg-[var(--color-teal-700)] hover:shadow-xl hover:shadow-teal-500/25',
    outline: 'border-2 border-[var(--border)] bg-transparent text-[color:var(--foreground)] hover:bg-[var(--warm-100)]',
    ghost: 'text-[color:var(--foreground)] hover:bg-[var(--warm-100)]',
  }

  const sizes = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
