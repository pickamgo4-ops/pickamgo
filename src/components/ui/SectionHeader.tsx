import React from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  emoji?: React.ReactNode
  subtitle?: string
  link?: string
  linkText?: string
  className?: string
}

export function SectionHeader({
  title,
  emoji,
  subtitle,
  link,
  linkText = 'See all',
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 className="font-display text-xl md:text-2xl font-bold text-warm-900 flex items-center gap-2">
          {emoji && <span className="flex items-center">{emoji}</span>}
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-warm-800/60 mt-0.5">{subtitle}</p>
        )}
      </div>
      {link && (
        <Link
          href={link}
          className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          {linkText}
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  )
}
