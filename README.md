# moonshot-credit-tracker
tool to track credits on moonshot shop

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

You can also see the exact URL in the workflow run output.
