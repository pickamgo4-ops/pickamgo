import test from 'node:test'
import assert from 'node:assert/strict'
import { isPriceDrop } from '../src/services/price-alerts'

test('price-drop detection only fires when the new price is lower', () => {
  const cases: Array<[number, number, boolean]> = [
    [100, 90, true],
    [100, 80, true],
    [100, 100, false],
    [100, 110, false],
    [90, 100, false],
  ]
  for (const [previous, next, expected] of cases) assert.equal(isPriceDrop(previous, next), expected, `${previous} -> ${next}`)
})

test('repeated unchanged prices do not create another drop event', () => {
  assert.equal(isPriceDrop(90, 90), false)
})