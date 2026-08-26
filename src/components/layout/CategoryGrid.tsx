'use client'

import React, { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { mapApiCategoryToFrontend } from '../../lib/api-mappers'
import { Category } from '../../types'
import * as LucideIcons from 'lucide-react'

interface CategoryGridProps {
  categories?: Category[]
  onSelect?: (category: string) => void
}

export function CategoryGrid({ categories: categoriesProp, onSelect }: CategoryGridProps) {
  const [categories, setCategories] = useState<Category[]>([])

  React.useEffect(() => {
    if (categoriesProp) {
      setCategories(categoriesProp)
      return
    }
    loadCategories()
  }, [categoriesProp])

  const loadCategories = async () => {
    try {
      const response = await api.get<any[]>('/categories')
      if (response.success && Array.isArray(response.data)) {
        setCategories(response.data.map(mapApiCategoryToFrontend))
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const displayCategories = categoriesProp || categories

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName]
    if (IconComponent) {
      return <IconComponent size={22} />
    }
    return <LucideIcons.PackageOpen size={22} />
  }

  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">
      {displayCategories.map((category: any) => (
        <button
          key={category.id}
          onClick={() => onSelect?.(category.name)}
          className="flex flex-col items-center gap-2 min-w-[72px] md:min-w-0 group"
        >
          <div
            className={`
              w-14 h-14 md:w-auto md:h-auto md:aspect-square md:rounded-2xl
              rounded-2xl flex items-center justify-center
              transition-all duration-300 group-hover:scale-110 group-hover:shadow-md
              ${category.color}
            `}
          >
            {renderIcon(category.icon)}
          </div>
          <span className="text-xs font-medium text-warm-900 whitespace-nowrap">
            {category.name}
          </span>
          <span className="text-[10px] text-warm-800/50">
            {category.count || 0}
          </span>
        </button>
      ))}
    </div>
  )
}
