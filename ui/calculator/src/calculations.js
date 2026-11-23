export function calculateOneOfEachRevenue(assetData, revenue) {
  if (!Number.isFinite(revenue) || revenue <= 0) {
    throw new RangeError('Revenue must be a positive number.')
  }

  const creditsByArtist = {}
  let totalCredits = 0

  for (const contributors of Object.values(assetData)) {
    for (const [artist, credit] of Object.entries(contributors)) {
      creditsByArtist[artist] = (creditsByArtist[artist] ?? 0) + credit
      totalCredits += credit
    }
  }

  if (totalCredits === 0) {
    return {
      rows: [],
      totalCredits,
      assetCount: Object.keys(assetData).length,
    }
  }

  const rows = Object.entries(creditsByArtist)
    .map(([artist, totalCredit]) => {
      const percentage = totalCredit / totalCredits

      return {
        artist,
        totalCredit,
        percentage,
        revenue: revenue * percentage,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || a.artist.localeCompare(b.artist))

  return {
    rows,
    totalCredits,
    assetCount: Object.keys(assetData).length,
  }
}
