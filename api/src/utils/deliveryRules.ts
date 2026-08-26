export type DeliveryType = 'DELIVERY' | 'PICKUP'
export type FulfillmentMethod = 'FIND_IT_NEAR_ME_RIDER' | 'SELLER_OWN_DELIVERY' | 'CUSTOMER_PICKUP'

export function normalizeDeliveryType(value: string): DeliveryType {
  return value.toUpperCase() === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
}

export function normalizeFulfillmentMethod(value: string): FulfillmentMethod {
  if (value === 'PICKUP' || value === 'CUSTOMER_PICKUP') return 'CUSTOMER_PICKUP'
  if (value === 'SELLER_DELIVERY' || value === 'SELLER_OWN_DELIVERY') return 'SELLER_OWN_DELIVERY'
  return 'FIND_IT_NEAR_ME_RIDER'
}

export function deliveryMethodError(
  shop: { deliveryAvailable: boolean; pickupAvailable: boolean; sellerDeliveryAvailable: boolean },
  deliveryType: DeliveryType,
  fulfillmentMethod: FulfillmentMethod,
): string | null {
  if (deliveryType === 'PICKUP') {
    return shop.pickupAvailable ? null : 'This shop only offers delivery'
  }

  if (fulfillmentMethod === 'SELLER_OWN_DELIVERY') {
    return shop.sellerDeliveryAvailable ? null : 'Seller delivery is not enabled for this shop'
  }

  return shop.deliveryAvailable ? null : 'Platform delivery is not enabled for this shop'
}
