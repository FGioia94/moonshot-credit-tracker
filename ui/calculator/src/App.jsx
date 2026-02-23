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

  const allowedAssets = useMemo(() => Object.keys(assetData), [assetData])

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assetsUrl = `${import.meta.env.BASE_URL}assets_data.json`
        const response = await fetch(assetsUrl)
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
