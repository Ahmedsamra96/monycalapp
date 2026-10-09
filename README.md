# مالي — Mali Ledger | Financial Snapshot Dashboard

An independent, **from-scratch** Next.js/TypeScript React application for tracking personal assets, loans, gold, and monthly changes. Developed without Lovable code or components. Mobile-first Arabic RTL interface with desktop dashboard navigation.

## Features
- Net-worth dashboard, balances, gold, people who owe you, liabilities you owe, and trend charts.
- Dated snapshots, edits and explicit deletion confirmation.
- Detailed balances for bank, OFII, Redotpay, and cash.
- Add/settle receivables and debts while simultaneously adjusting account balance: avoids counting transfers as spending.
- Gold quantity/purity/pricing, live market estimate and saved gold price history.
- Monthly spending/increase estimates, budget, historical comparison, CSV export.
- No accounts or password, per owner's request.

## Single source of truth
This app uses an **independent Supabase database** restored from the original Lovable Cloud backup. The original Lovable database remains untouched; original snapshot IDs, financial figures, gold prices, dates and settings were preserved and verified. The application never runs a seed or overwrites restored rows on startup.

The restored database has the following financial tables:
- `snapshots`: `id`, `recorded_at`, `bank`, `ofii`, `redotpay`, `cash`, `people` (JSONB), `liabilities` (JSONB), `gold_grams`, `gold_karat`, `gold_price_per_gram`, `note`.
- `gold_prices`: `id`, `recorded_at`, `price_per_gram`.
- `app_settings`: `id='default'`, `monthly_budget`, `default_karat`, `default_grams`, `onboarded`, `updated_at`.

### Deploy and configure
1. Import the GitHub repository into Vercel using **Next.js** preset.
2. Set two **server-side environment variables** on Vercel, never `NEXT_PUBLIC_*`:
   - `SUPABASE_URL`: URL of the **new monycalapp Supabase project** (not the Lovable Cloud URL).
   - `SUPABASE_SECRET_KEY`: a **server-only secret key** (`sb_secret_...`) from the new Supabase project's Settings → API Keys. A legacy `SUPABASE_SERVICE_ROLE_KEY` also works as a fallback.
3. Deploy. Until both variables are configured the interface deliberately shows a connection error rather than demo values.
4. Read-only check: confirm number of stored snapshots and historical values in app before editing.

> **Security note:** There is intentionally **no login**, so anyone who discovers the published site can read and alter financial data through its APIs. An unlisted URL and `noindex` do **not** secure it. The service key stays server-side, but the server exposes data operations by design. Use Vercel deployment protection, an access-control layer, or a private network if confidentiality is needed.

## Local setup
- `npm install`
- copy `.env.example` to `.env.local` and fill values locally (never commit)
- `npm run dev` — start at localhost:3000
- `npm run typecheck` and `npm test` — verify finance calculation logic

## No data corruption by default
This project includes no demo seed and no schema migrations. A failed cloud request never overwrites real data with localStorage. Snapshots preserve original IDs on edit and are inserted without choosing old IDs for new rows. Deletion always requires confirmation. `CSV` export is generated in the browser from values already loaded into memory.


## Repository and deployment status

- GitHub: https://github.com/Ahmedsamra96/monycalapp
- CI: `npm test`, `npm run typecheck`, and `npm run build` run automatically with GitHub Actions.
- The current repository is **public**. No personal financial records or database secret keys are committed.
- Live data requires deploying to Vercel with **both** `SUPABASE_URL` and `SUPABASE_SECRET_KEY` configured in server-only environment settings. Without both, the application intentionally displays a connection error.
- The existing Lovable-managed database remains unchanged. Do not run seeds or migrations.
