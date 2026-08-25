import React from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallback?: string
}

export function Avatar({
  src,
  alt = 'User',
  size = 'md',
  className = '',
  fallback,
}: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full overflow-hidden bg-warm-200 flex items-center justify-center
        flex-shrink-0
        ${className}
      `}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold text-warm-800">
          {fallback || alt.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
