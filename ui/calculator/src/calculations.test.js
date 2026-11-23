import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateOneOfEachRevenue } from './calculations.js'

test('allocates one revenue pool by total credits across the whole library', () => {
  const result = calculateOneOfEachRevenue(
    {
      Dragon: { Alice: 1, Bob: 3 },
      Rhino: { Alice: 1, Carol: 2 },
    },
    700,
  )

  assert.equal(result.assetCount, 2)
  assert.equal(result.totalCredits, 7)
  assert.deepEqual(
    result.rows.map(({ artist, totalCredit, revenue }) => ({
      artist,
      totalCredit,
      revenue,
    })),
    [
      { artist: 'Bob', totalCredit: 3, revenue: 300 },
      { artist: 'Alice', totalCredit: 2, revenue: 200 },
      { artist: 'Carol', totalCredit: 2, revenue: 200 },
    ],
  )
})

test('rejects non-positive revenue values', () => {
  assert.throws(
    () => calculateOneOfEachRevenue({ Dragon: { Alice: 1 } }, 0),
    /positive number/,
  )
})

test('returns no allocations when the library has no credits', () => {
  assert.deepEqual(calculateOneOfEachRevenue({ Dragon: {} }, 100), {
    rows: [],
    totalCredits: 0,
    assetCount: 1,
  })
})
