import test from 'node:test'
import assert from 'node:assert/strict'
import { isRestockTransition } from '../src/services/stock-alerts'

test('restock detection only fires for zero-or-less to positive stock', () => {
  const cases: Array<[number, number, boolean]> = [
    [100, 90, false],
    [1, 0, false],
    [0, 0, false],
    [0, 1, true],
    [0, 10, true],
    [10, 5, false],
    [5, 0, false],
    [0, 5, true],
  ]
  for (const [previous, next, expected] of cases) {
    assert.equal(isRestockTransition(previous, next), expected, `${previous} -> ${next}`)
  }
})