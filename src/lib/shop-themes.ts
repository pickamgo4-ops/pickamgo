import type { CSSProperties } from 'react'

export type ShopTheme = 'CLEAN' | 'MIDNIGHT' | 'SOFT' | 'LUXURY' | 'FRESH' | 'QUICK_PICKS' | 'STREET' | 'BEAUTY'
export type ShopLayout = 'CLASSIC' | 'GRID' | 'FEATURED' | 'BEAUTY' | 'QUICK_PICKS'
export type ShopHeaderStyle = 'STANDARD' | 'COMPACT' | 'CENTERED'
export type ShopBannerStyle = 'COVER' | 'SHORT' | 'MINIMAL'
export type ProductCardStyle = 'SOFT' | 'OUTLINED' | 'EDITORIAL'

export interface ShopCustomization {
  theme: ShopTheme
  layout: ShopLayout
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logo?: string | null
  coverImage?: string | null
  profileImage?: string | null
  description?: string | null
  announcement?: string | null
  featuredProductId?: string | null
  showReviews: boolean
  showCategories: boolean
  showFeatured: boolean
  showServices: boolean
  headerStyle: ShopHeaderStyle
  bannerStyle: ShopBannerStyle
  productCardStyle: ProductCardStyle
  productColumns: number
  showAbout: boolean
  showHours: boolean
  showContact: boolean
  sectionOrder: string
}

export const themePresets: Array<{ id: ShopTheme; name: string; description: string; colors: [string, string, string] }> = [
  { id: 'CLEAN', name: 'Clean', description: 'Bright, crisp and easy to browse', colors: ['#1769D1', '#EAF5FF', '#102A43'] },
  { id: 'MIDNIGHT', name: 'Midnight', description: 'Confident dark surfaces with warm highlights', colors: ['#F4A261', '#17202A', '#F8F1E7'] },
  { id: 'SOFT', name: 'Soft', description: 'Calm neutrals for an inviting storefront', colors: ['#B76E79', '#FAF5F2', '#47343A'] },
  { id: 'LUXURY', name: 'Luxury', description: 'Editorial spacing and premium contrast', colors: ['#B08D57', '#171614', '#F4E8D0'] },
  { id: 'FRESH', name: 'Fresh', description: 'Energetic color for everyday finds', colors: ['#168AAD', '#EAF7F5', '#12343B'] },
  { id: 'QUICK_PICKS', name: 'Quick Picks', description: 'Playful, polished and quick to scan', colors: ['#5B5BD6', '#F4F2FF', '#202047'] },
  { id: 'STREET', name: 'Street', description: 'Bold blocks and high-impact product cards', colors: ['#E63946', '#171717', '#F1FAEE'] },
  { id: 'BEAUTY', name: 'Beauty', description: 'Elegant presentation for products and services', colors: ['#C06C84', '#FFF8F5', '#4A2633'] },
]

export const defaultShopCustomization: ShopCustomization = {
  theme: 'CLEAN', layout: 'CLASSIC', primaryColor: '#1769D1', secondaryColor: '#EAF5FF', accentColor: '#102A43',
  showReviews: true, showCategories: true, showFeatured: true, showServices: true,
  headerStyle: 'STANDARD', bannerStyle: 'COVER', productCardStyle: 'SOFT', productColumns: 4,
  showAbout: true, showHours: true, showContact: true, sectionOrder: 'featured,products,services,reviews,about',
}

export function shopCustomizationStyle(customization: ShopCustomization): CSSProperties {
  return {
    '--shop-primary': customization.primaryColor,
    '--shop-secondary': customization.secondaryColor,
    '--shop-accent': customization.accentColor,
    '--shop-text': readableTextColor(customization.secondaryColor),
    '--shop-primary-text': readableTextColor(customization.primaryColor),
    '--shop-border': `${customization.accentColor}33`,
    '--shop-muted': `${customization.accentColor}99`,
    '--shop-surface': customization.secondaryColor,
    '--shop-button': customization.primaryColor,
    '--shop-card-radius': customization.productCardStyle === 'EDITORIAL' ? '0.25rem' : customization.productCardStyle === 'OUTLINED' ? '0.75rem' : '1rem',
  } as CSSProperties
}

export function themeClass(theme: ShopTheme) {
  return {
    CLEAN: 'theme-CLEAN',
    MIDNIGHT: 'theme-MIDNIGHT',
    SOFT: 'theme-SOFT',
    LUXURY: 'theme-LUXURY',
    FRESH: 'theme-FRESH',
    QUICK_PICKS: 'theme-QUICK_PICKS',
    STREET: 'theme-STREET',
    BEAUTY: 'theme-BEAUTY',
  }[theme]
}

function channel(value: string, offset: number) {
  return parseInt(value.slice(offset, offset + 2), 16) / 255
}

function luminance(color: string) {
  const red = channel(color, 1)
  const green = channel(color, 3)
  const blue = channel(color, 5)
  const transform = (value: number) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  return 0.2126 * transform(red) + 0.7152 * transform(green) + 0.0722 * transform(blue)
}

export function readableTextColor(background: string) {
  try {
    const contrastWithWhite = (1.05) / (luminance(background) + 0.05)
    return contrastWithWhite >= 4.5 ? '#FFFFFF' : '#171614'
  } catch {
    return '#171614'
  }
}
