# moonshot-credit-tracker
tool to track credits on moonshot shop.

## Revenue calculator

The React calculator supports:

- Per-asset purchases, with revenue split among that asset's credited artists.
- A **One of each asset revenue** scenario, where a net revenue pool is split using every
  artist's combined credit across the complete asset library.
- PDF exports for both calculation types.

In the one-of-each scenario, enter the net revenue already available for artist distribution.
The calculator counts each library asset once, sums all artist credits across those assets,
and allocates the revenue by each artist's share of the total library credit.

## Deploy on GitHub Pages

This repo is configured to deploy the React UI in `ui/calculator` automatically through GitHub Actions.

### 1) Push to GitHub

From the repository root:

```powershell
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

### 2) Enable Pages (first time only)

In your GitHub repository:

- Go to **Settings** → **Pages**.
- Under **Build and deployment**, set **Source** to **GitHub Actions**.

### 3) Open your deployed app

After the workflow finishes, your app URL will be:

`https://<your-github-username>.github.io/moonshot-credit-tracker/`

You can also see the exact URL in the workflow run output
