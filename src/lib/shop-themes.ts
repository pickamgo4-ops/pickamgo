export type ShopTheme = 'CLEAN' | 'MIDNIGHT' | 'SOFT' | 'LUXURY' | 'FRESH' | 'QUICK_PICKS' | 'STREET' | 'BEAUTY'
export type ShopLayout = 'CLASSIC' | 'GRID' | 'FEATURED' | 'BEAUTY' | 'QUICK_PICKS'

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
}

export const themePresets: Array<{ id: ShopTheme; name: string; description: string; colors: [string, string, string] }> = [
  { id: 'CLEAN', name: 'Clean', description: 'Bright, crisp and easy to browse', colors: ['#FF6B35', '#FFF5E6', '#2C1F15'] },
  { id: 'MIDNIGHT', name: 'Midnight', description: 'Confident dark surfaces with warm highlights', colors: ['#F4A261', '#17202A', '#F8F1E7'] },
  { id: 'SOFT', name: 'Soft', description: 'Calm neutrals for an inviting storefront', colors: ['#B76E79', '#FAF5F2', '#47343A'] },
  { id: 'LUXURY', name: 'Luxury', description: 'Editorial spacing and premium contrast', colors: ['#B08D57', '#171614', '#F4E8D0'] },
  { id: 'FRESH', name: 'Fresh', description: 'Energetic color for everyday finds', colors: ['#168AAD', '#EAF7F5', '#12343B'] },
  { id: 'QUICK_PICKS', name: 'Quick Picks', description: 'Playful, polished and quick to scan', colors: ['#5B5BD6', '#F4F2FF', '#202047'] },
  { id: 'STREET', name: 'Street', description: 'Bold blocks and high-impact product cards', colors: ['#E63946', '#171717', '#F1FAEE'] },
  { id: 'BEAUTY', name: 'Beauty', description: 'Elegant presentation for products and services', colors: ['#C06C84', '#FFF8F5', '#4A2633'] },
]

export const defaultShopCustomization: ShopCustomization = {
  theme: 'CLEAN', layout: 'CLASSIC', primaryColor: '#FF6B35', secondaryColor: '#FFF5E6', accentColor: '#2C1F15',
  showReviews: true, showCategories: true, showFeatured: true, showServices: true,
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
