import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import './App.css'

function App() {
  const [assetData, setAssetData] = useState({})
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [asset, setAsset] = useState('')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [purchases, setPurchases] = useState([])
  const [revenueRows, setRevenueRows] = useState([])
  const [artistTotals, setArtistTotals] = useState([])
  const [artistCredits, setArtistCredits] = useState([])
  const [lookupType, setLookupType] = useState('artist')
  const [lookupTarget, setLookupTarget] = useState('')
  const [lookupSortBy, setLookupSortBy] = useState('name')

  const allowedAssets = useMemo(() => Object.keys(assetData), [assetData])

  const artistCreditMap = useMemo(() => {
    const creditsMap = {}

    for (const [assetName, contributors] of Object.entries(assetData)) {
      for (const [artistName, credit] of Object.entries(contributors)) {
        if (!creditsMap[artistName]) {
          creditsMap[artistName] = []
        }

        creditsMap[artistName].push({
          asset: assetName,
          credit,
        })
      }
    }

    return creditsMap
  }, [assetData])

  const lookupOptions = useMemo(() => {
    if (lookupType === 'artist') {
      return Object.keys(artistCreditMap).sort((a, b) => a.localeCompare(b))
    }

    return allowedAssets.slice().sort((a, b) => a.localeCompare(b))
  }, [lookupType, artistCreditMap, allowedAssets])

  const selectedArtistCredits = lookupType === 'artist' ? artistCreditMap[lookupTarget] ?? [] : []
  const selectedAssetContributors =
    lookupType === 'asset' ? Object.entries(assetData[lookupTarget] ?? {}) : []

  const sortedSelectedArtistCredits = useMemo(() => {
    const rows = selectedArtistCredits.slice()

    if (lookupSortBy === 'credits') {
      rows.sort((a, b) => b.credit - a.credit || a.asset.localeCompare(b.asset))
      return rows
    }

    rows.sort((a, b) => a.asset.localeCompare(b.asset) || b.credit - a.credit)
    return rows
  }, [selectedArtistCredits, lookupSortBy])

  const sortedSelectedAssetContributors = useMemo(() => {
    const rows = selectedAssetContributors
      .map(([artistName, credit]) => ({ artistName, credit }))

    if (lookupSortBy === 'credits') {
      rows.sort((a, b) => b.credit - a.credit || a.artistName.localeCompare(b.artistName))
      return rows
    }

    rows.sort((a, b) => a.artistName.localeCompare(b.artistName) || b.credit - a.credit)
    return rows
  }, [selectedAssetContributors, lookupSortBy])

  const selectedArtistTotalCredit = selectedArtistCredits.reduce(
    (sum, row) => sum + row.credit,
    0,
  )
  const selectedAssetTotalCredit = selectedAssetContributors.reduce(
    (sum, [, credit]) => sum + credit,
    0,
  )

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assetsUrl = `${import.meta.env.BASE_URL}assets_data.json`
        const response = await fetch(assetsUrl, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load assets_data.json')
        }

        const data = await response.json()
        setAssetData(data)

        const firstAsset = Object.keys(data)[0] ?? ''
        setAsset(firstAsset)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unknown loading error')
      } finally {
        setIsLoadingAssets(false)
      }
    }

    loadAssets()
  }, [])

  useEffect(() => {
    if (lookupOptions.length === 0) {
      setLookupTarget('')
      return
    }

    if (!lookupOptions.includes(lookupTarget)) {
      setLookupTarget(lookupOptions[0])
    }
  }, [lookupOptions, lookupTarget])

  const addPurchase = () => {
    const parsedAmount = Number(amount)
    const parsedPrice = Number(price)

    if (!asset || !allowedAssets.includes(asset)) {
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return
    }

    setPurchases((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        asset,
        amount: parsedAmount,
        price: parsedPrice,
      },
    ])

    setAmount('')
    setPrice('')
  }

  const removePurchase = (id) => {
    setPurchases((current) => current.filter((purchase) => purchase.id !== id))
  }

  const getCalculationData = () => {
    const totalPerAsset = {}
    const totalAmountPerAsset = {}

    for (const purchase of purchases) {
      const purchaseTotal = purchase.amount * purchase.price * 0.6
      if (!totalPerAsset[purchase.asset]) {
        totalPerAsset[purchase.asset] = 0
      }
      totalPerAsset[purchase.asset] += purchaseTotal

      if (!totalAmountPerAsset[purchase.asset]) {
        totalAmountPerAsset[purchase.asset] = 0
      }
      totalAmountPerAsset[purchase.asset] += purchase.amount
    }

    const rows = []
    const totalsByArtist = {}
    const creditsByArtist = {}

    for (const [assetName, totalMoney] of Object.entries(totalPerAsset)) {
      const contributors = assetData[assetName] ?? {}
      const credits = Object.values(contributors)
      const totalCredits = credits.reduce((sum, credit) => sum + credit, 0)

      if (!totalCredits) {
        continue
      }

      for (const [artistName, artistCredit] of Object.entries(contributors)) {
        const percentage = artistCredit / totalCredits
        const revenue = totalMoney * percentage
        const weightedCredit = artistCredit * totalAmountPerAsset[assetName]

        rows.push({
          asset: assetName,
          artist: artistName,
          credit: artistCredit,
          percentage,
          revenue,
        })

        totalsByArtist[artistName] = (totalsByArtist[artistName] ?? 0) + revenue
        creditsByArtist[artistName] = (creditsByArtist[artistName] ?? 0) + weightedCredit
      }
    }

    rows.sort((a, b) => b.revenue - a.revenue)
    const totalRows = Object.entries(totalsByArtist)
      .map(([artistName, totalRevenue]) => ({ artist: artistName, totalRevenue }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    const creditRows = Object.entries(creditsByArtist)
      .map(([artistName, totalCredit]) => ({ artist: artistName, totalCredit }))
      .sort((a, b) => b.totalCredit - a.totalCredit)

    return { rows, totalRows, creditRows }
  }

  const calculateRevenue = () => {
    const { rows, totalRows, creditRows } = getCalculationData()

    setRevenueRows(rows)
    setArtistTotals(totalRows)
    setArtistCredits(creditRows)
  }

  const downloadPdfReport = () => {
    if (purchases.length === 0) {
      return
    }

    const { rows, totalRows, creditRows } = getCalculationData()

    setRevenueRows(rows)
    setArtistTotals(totalRows)
    setArtistCredits(creditRows)

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const reportDate = new Date().toLocaleString()

    doc.setFontSize(18)
    doc.text('Moonshot Credit Revenue Report', 40, 40)
    doc.setFontSize(10)
    doc.text(`Generated: ${reportDate}`, 40, 58)
    doc.text(`Total net purchase value: ${totalNetPurchaseValue.toFixed(2)}`, 40, 74)

    autoTable(doc, {
      startY: 92,
      head: [['Asset', 'Amount', 'Price', 'Net value (x0.6)']],
      body: purchases.map((purchase) => [
        purchase.asset,
        purchase.amount,
        purchase.price.toFixed(2),
        (purchase.amount * purchase.price * 0.6).toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [58, 108, 240] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [['Asset', 'Artist', 'Credit', 'Credit %', 'Revenue']],
      body: rows.map((row) => [
        row.asset,
        row.artist,
        row.credit,
        `${(row.percentage * 100).toFixed(2)}%`,
        row.revenue.toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [58, 108, 240] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [['Artist', 'Total credit (weighted by amount)']],
      body: creditRows.map((artist) => [artist.artist, artist.totalCredit.toFixed(2)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [58, 108, 240] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [['Artist', 'Total revenue']],
      body: totalRows.map((artist) => [artist.artist, artist.totalRevenue.toFixed(2)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [58, 108, 240] },
    })

    doc.save('moonshot-credit-report.pdf')
  }

  const totalNetPurchaseValue = purchases.reduce(
    (sum, purchase) => sum + purchase.amount * purchase.price * 0.6,
    0,
  )

  return (
    <main className="page">
      <h1>Credit Revenue Calculator</h1>

      {isLoadingAssets && <p>Loading assets...</p>}
      {loadError && <p className="error">{loadError}</p>}

      {!isLoadingAssets && !loadError && (
        <>
          <section className="card">
            <h2>Add purchase</h2>
            <div className="row">
              <label>
                Asset
                <select value={asset} onChange={(event) => setAsset(event.target.value)}>
                  {allowedAssets.map((assetName) => (
                    <option key={assetName} value={assetName}>
                      {assetName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 3"
                />
              </label>

              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="e.g. 4000"
                />
              </label>
            </div>

            <button type="button" onClick={addPurchase}>
              Add purchase
            </button>
          </section>

          <section className="card">
            <h2>Credit lookup (general)</h2>
            <div className="row">
              <label>
                Lookup by
                <select value={lookupType} onChange={(event) => setLookupType(event.target.value)}>
                  <option value="artist">Artist</option>
                  <option value="asset">Asset</option>
                </select>
              </label>

              <label>
                {lookupType === 'artist' ? 'Artist' : 'Asset'}
                <select
                  value={lookupTarget}
                  onChange={(event) => setLookupTarget(event.target.value)}
                  disabled={lookupOptions.length === 0}
                >
                  {lookupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sort by
                <select
                  value={lookupSortBy}
                  onChange={(event) => setLookupSortBy(event.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="credits">Credits amount</option>
                </select>
              </label>
            </div>

            {!lookupTarget ? (
              <p>No credits available in the loaded JSON.</p>
            ) : lookupType === 'artist' ? (
              <>
                <p className="total">Total credits for {lookupTarget}: {selectedArtistTotalCredit}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSelectedArtistCredits.map((row) => (
                      <tr key={`${lookupTarget}-${row.asset}`}>
                        <td>{row.asset}</td>
                        <td>{row.credit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <p className="total">Total credits for {lookupTarget}: {selectedAssetTotalCredit}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Credit</th>
                      <th>Credit %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSelectedAssetContributors.map((row) => (
                      <tr key={`${lookupTarget}-${row.artistName}`}>
                        <td>{row.artistName}</td>
                        <td>{row.credit}</td>
                        <td>
                          {selectedAssetTotalCredit
                            ? `${((row.credit / selectedAssetTotalCredit) * 100).toFixed(2)}%`
                            : '0.00%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section className="card">
            <h2>Purchases</h2>
            {purchases.length === 0 ? (
              <p>No purchases yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Net value (x 0.6)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.asset}</td>
                      <td>{purchase.amount}</td>
                      <td>{purchase.price.toFixed(2)}</td>
                      <td>{(purchase.amount * purchase.price * 0.6).toFixed(2)}</td>
                      <td>
                        <button type="button" onClick={() => removePurchase(purchase.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="total">Total net purchase value: {totalNetPurchaseValue.toFixed(2)}</p>

            <div className="actions">
              <button type="button" onClick={calculateRevenue} disabled={purchases.length === 0}>
                Calculate revenue
              </button>
              <button type="button" onClick={downloadPdfReport} disabled={purchases.length === 0}>
                Download PDF report
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Revenue by asset and artist</h2>
            {revenueRows.length === 0 ? (
              <p>Add purchases and click calculate.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Artist</th>
                    <th>Credit</th>
                    <th>Credit %</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueRows.map((row) => (
                    <tr key={`${row.asset}-${row.artist}`}>
                      <td>{row.asset}</td>
                      <td>{row.artist}</td>
                      <td>{row.credit}</td>
                      <td>{(row.percentage * 100).toFixed(2)}%</td>
                      <td>{row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {artistCredits.length > 0 && (
              <>
                <h3>Credits by artist</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Total credit (weighted by amount)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artistCredits.map((artist) => (
                      <tr key={artist.artist}>
                        <td>{artist.artist}</td>
                        <td>{artist.totalCredit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {artistTotals.length > 0 && (
              <>
                <h3>Artist totals</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Total revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artistTotals.map((artist) => (
                      <tr key={artist.artist}>
                        <td>{artist.artist}</td>
                        <td>{artist.totalRevenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default App
