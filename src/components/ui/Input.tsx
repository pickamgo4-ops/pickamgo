import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
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
  className = '',
  disabled = false,
  label,
  ...rest
}: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onValueChange?.(e.target.value)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-warm-900 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-800/50">
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
          w-full bg-white border border-warm-200 rounded-xl
          py-3.5 px-4 text-warm-900 placeholder:text-warm-800/40
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          transition-all duration-200
          ${icon ? 'pl-12' : ''}
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
