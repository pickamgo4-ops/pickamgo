import test from 'node:test'
import assert from 'node:assert/strict'
import { zoneMatchesAddress } from '../src/routes/seller-store'

test('shipping zones match customer addresses by city, area, or specific location', () => {
  const zone = { name: 'Accra', region: 'Greater Accra', city: 'Accra', area: 'Legon', locations: JSON.stringify(['Osu', 'Airport']) }
  assert.equal(zoneMatchesAddress(zone, 'Legon, Accra'), true)
  assert.equal(zoneMatchesAddress(zone, 'Airport Residential Area'), true)
  assert.equal(zoneMatchesAddress(zone, 'Kumasi, Ashanti'), false)
})