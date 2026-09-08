import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  centerIcon?: boolean
  className?: string
  onValueChange?: (value: string) => void
  label?: string
}

export function Input({
  placeholder,
  value,
  onChange,
  onValueChange,
  type = 'text',
  icon,
  rightIcon,
  centerIcon = false,
  className = '',
  disabled = false,
  label,
  ...rest
}: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onValueChange?.(e.target.value)
  }

  const iconPosition = centerIcon ? 'left-1/2 -translate-x-1/2' : 'left-4'

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[color:var(--foreground)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={`absolute top-1/2 -translate-y-1/2 text-[color:var(--muted)] ${iconPosition}`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`
            w-full bg-[var(--input-background)] border border-[var(--input-border)] rounded-xl
            py-3.5 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] focus:border-[var(--color-primary-500)]
            transition-all duration-200
            ${icon ? (centerIcon ? 'pl-12 pr-4 text-center' : 'pl-12 pr-4') : 'px-4'}
            ${rightIcon ? 'pr-12' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          {...rest}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  )
}
