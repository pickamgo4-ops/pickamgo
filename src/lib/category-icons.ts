import type { LucideIcon } from 'lucide-react'
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Gem,
  Handshake,
  HeartPulse,
  Home,
  Laptop,
  Luggage,
  Music2,
  PackageOpen,
  PawPrint,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Wheat,
  Wrench,
} from 'lucide-react'

const categoryIcons: Record<string, LucideIcon> = {
  electronics: Smartphone,
  fashion: Shirt,
  beauty: Sparkles,
  'home-furniture': Home,
  food: ShoppingBasket,
  'phones-tablets': Smartphone,
  'computers-electronics': Laptop,
  'health-wellness': HeartPulse,
  'baby-kids': Baby,
  'sports-fitness': Dumbbell,
  automotive: Car,
  'books-music-media': BookOpen,
  'office-stationery': BriefcaseBusiness,
  'tools-hardware': Wrench,
  agriculture: Wheat,
  'pets-animals': PawPrint,
  'events-entertainment': Music2,
  'jewelry-accessories': Gem,
  'travel-luggage': Luggage,
  services: Handshake,
}

export function getCategoryIcon(category: { id?: string; slug?: string; name?: string; icon?: string }): LucideIcon {
  const key = category.id || category.slug || ''
  if (categoryIcons[key]) return categoryIcons[key]

  const normalizedName = (category.name || '').toLowerCase()
  const match = Object.entries(categoryIcons).find(([categoryKey]) => normalizedName.includes(categoryKey.replace(/-/g, ' ')))
  return match?.[1] || PackageOpen
}
