import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePercentageOff } from '../src/utils/pricing'
import { calculateProductPrice } from '../src/services/product-pricing'

test('calculates percentage off from original and current prices', () => {
  assert.equal(calculatePercentageOff(500, 400), 20)
  assert.equal(calculatePercentageOff(100, 90), 10)
})

test('does not expose discounts without a real price reduction', () => {
  assert.equal(calculatePercentageOff(100, 100), undefined)
  assert.equal(calculatePercentageOff(100, 110), undefined)
  assert.equal(calculatePercentageOff(undefined, 90), undefined)
})

test('uses an active promotion as the final payable product price', () => {
  assert.deepEqual(calculateProductPrice({ price: 500, originalPrice: 550, promotion: { originalPrice: 500, finalPrice: 400 } }), {
    finalPrice: 400,
    originalPrice: 550,
    discountPercentage: 27,
    promotionApplied: true,
  })
})

test('applies the same promotion rate to a selected variant', () => {
  const pricing = calculateProductPrice({ price: 500, promotion: { originalPrice: 500, finalPrice: 400 }, variant: { price: 450, originalPrice: 480 } })
  assert.equal(pricing.finalPrice, 360)
  assert.equal(pricing.originalPrice, 480)
  assert.equal(pricing.discountPercentage, 25)
})

test('keeps regular price when no promotion or original price is valid', () => {
  assert.deepEqual(calculateProductPrice({ price: 125, originalPrice: 125 }), { finalPrice: 125, originalPrice: undefined, discountPercentage: undefined, promotionApplied: false })
})
