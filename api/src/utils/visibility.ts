export const publicProductVisibility = {
  status: 'ACTIVE',
  stock: { gt: 0 },
  shop: { status: 'ACTIVE' },
} as const

export const publicServiceVisibility = {
  status: 'ACTIVE',
  shop: { status: 'ACTIVE' },
} as const

export const publicShopVisibility = {
  status: 'ACTIVE',
} as const
