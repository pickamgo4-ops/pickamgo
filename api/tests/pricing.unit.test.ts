import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePercentageOff } from '../src/utils/pricing'

test('calculates percentage off from original and current prices', () => {
  assert.equal(calculatePercentageOff(500, 400), 20)
  assert.equal(calculatePercentageOff(100, 90), 10)
})

test('does not expose discounts without a real price reduction', () => {
  assert.equal(calculatePercentageOff(100, 100), undefined)
  assert.equal(calculatePercentageOff(100, 110), undefined)
  assert.equal(calculatePercentageOff(undefined, 90), undefined)
})
