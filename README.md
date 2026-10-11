# Spendly

A personal expense tracker for people who want their numbers to be right.

Spendly records what you spend and turns it into figures you can trust: totals, daily
averages, category breakdowns, and month-over-month comparisons computed by a single set of
pure functions, so the dashboard, analytics, and reports can never disagree with each other.
Data is private per account, and any view can be exported to a clean Excel workbook that
mirrors the screen.

<!--
  Screenshots
  -----------
  Add real captures to `docs/screenshots/` and the table below will render on GitHub.
  Suggested set (desktop unless noted):
    docs/screenshots/dashboard.png   — dashboard with stat cards and charts
    docs/screenshots/expenses.png    — expense list with filters applied
    docs/screenshots/analytics.png   — analytics period view
    docs/screenshots/reports.png     — reports summary and export
    docs/screenshots/settings.png    — appearance, currency, categories
    docs/screenshots/mobile.png      — dashboard at ~390px wide
  Keep files small (< 500 KB each) and crop out personal data before committing.
-->

<!-- Screenshot table template — uncomment once the images above exist.
<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dashboard.png" alt="Dashboard"><br><sub>Dashboard</sub></td>
    <td width="50%"><img src="docs/screenshots/expenses.png" alt="Expenses"><br><sub>Expenses</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/analytics.png" alt="Analytics"><br><sub>Analytics</sub></td>
    <td width="50%"><img src="docs/screenshots/reports.png" alt="Reports and Excel export"><br><sub>Reports</sub></td>
  </tr>
</table>
-->

## What it does

**Fast capture.** Add an expense in seconds from the header action on desktop or the
floating button on mobile. Amount, date, category, and an optional note; totals update
everywhere the moment you save.

**A dashboard that answers "how am I doing?"** Total spent this month, expense count,
average daily spend, top category, a daily spending chart, a category breakdown, and a
month-over-month comparison.

**Search and filter.** Free-text search across titles and notes, amount ranges, date ranges,
and category filters, with a live count and filtered total as you narrow things down.

**Analytics over any period.** This month, last month, this year, all time, or a custom
range — with a trend chart (daily or monthly), category rankings, your largest expenses, and
per-category change against the previous period.

**Reports and Excel export.** Monthly and yearly reports, plus a three-sheet workbook
(`Expenses`, `Category Totals`, `Monthly Totals`) exported from five range presets: this
month, last month, this year, all time, or a custom range.

**Categories you control.** Thirteen sensible defaults, plus your own: add, rename,
recolour, and change the icon. Categories in use are protected from deletion.

**Appearance and currency.** Light, dark, or system theme, and five display currencies.

**Private by default.** Every expense, category, and preference belongs to one account.
Ownership is resolved from the server session on every request — never from anything the
client sends.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — spending at a glance, add-expense entry point |
| `/expenses` | Expense list with search, filters, sorting, add/edit/delete |
| `/analytics` | Trends, category rankings, largest expenses, category changes |
| `/reports` | Monthly and yearly reports, Excel export |
| `/settings` | Theme, currency, categories, account, data reset |
| `/login`, `/sign-up` | Email and password authentication |
| `/forgot-password` | Owner-assisted account recovery |

Every route except the three auth screens requires a session; signed-out visitors are
redirected to `/login`.

## Supported currencies

INR (₹) · USD ($) · EUR (€) · AED (د.إ) · SAR (ر.س)

Amounts are stored as plain numbers, so switching currency reformats every figure
instantly — Indian digit grouping for INR, standard grouping for the others. Nothing is
converted or rounded away.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 — App Router, Server Components, Server Actions |
| Language | TypeScript 5, strict mode |
| UI | React 19, Tailwind CSS 4 with design tokens as CSS variables |
| Data | MongoDB via the official Node driver |
| Auth | Better Auth — email + password, http-only session cookies |
| Charts | Recharts |
| Export | SheetJS (`xlsx`), generated in the browser |
| Validation | Zod, with `server-only` guarding server modules |

## Getting started

**Requirements**

- Node.js **20.19 or newer** (required by the MongoDB driver)
- A reachable MongoDB instance — a local `mongod`, or an Atlas cluster

**Setup**

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open <http://localhost:3000> and create an account. All configuration lives in
`.env.local`, which is gitignored — see the variable table below.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Connection string including the database name: `mongodb+srv://<user>:<password>@<cluster-host>/<database>` |
| `BETTER_AUTH_SECRET` | Yes | Session-signing secret. Generate with `npx @better-auth/cli secret` |
| `BETTER_AUTH_URL` | Yes | The origin the app is actually served from. It must match exactly, or state-changing auth requests are rejected with `403 INVALID_ORIGIN` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | No | Comma-separated extra origins allowed to call the auth endpoints (for example a preview deployment) |

All values are server-only. Never give them a `NEXT_PUBLIC_` prefix. Loopback origins on
any port are trusted automatically outside production.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run recover:account` | Owner-only account recovery CLI |

## Project structure

```text
src/
  app/            Routes: (shell) for the authenticated app, plus auth screens
  components/     App shell and reusable UI primitives
  config/         Site metadata, navigation, public env parsing
  features/       auth, categories, expenses, settings — models, data, and UI
  lib/            analytics, export, mongo, format helpers, session helpers
  proxy.ts        Early redirect for signed-out requests on protected routes
scripts/          Owner-only account recovery CLI
```

Pages call repositories, which call server actions. Every action resolves the acting user
from the server session, and each module is scoped to that user's id. Financial
calculations are pure functions in `src/lib/analytics/`, shared by every screen and by the
Excel export, which is why the numbers agree everywhere.

## Data and privacy

- Better Auth manages `user`, `account`, `session`, and `verification`.
- Spendly owns `expenses`, `categories`, and `user_preferences`.
- Every document is scoped to the authenticated user's id, and indexes are created
  idempotently on first use.
- MongoDB is only ever reached from server code; the connection string never reaches the
  browser.
- Sessions live in http-only cookies. The browser never holds a token the app reads.
- Preferences (theme, currency) are stored per account and applied after sign-in.

## Account recovery

There is deliberately no email-based password reset. When someone loses access to their
mailbox, the owner restores the **existing** account — user id, expenses, categories, and
settings are all preserved; only the password changes.

```bash
# Report only — shows the account and its data, writes nothing
npm run recover:account -- --email user@example.com

# Apply a temporary password (prompted, hidden input)
npm run recover:account -- --email user@example.com --confirm
```

Without `--confirm` the tool never writes anything. The password is typed at a hidden prompt
or piped on stdin — never passed as an argument, printed, or logged. Existing sessions are
revoked by default. The CLI is a local operations tool, not reachable through any route.

## Deployment

Any Node host works. On Vercel:

1. **Set the environment variables above** before the first build (Production, and Preview
   if you want preview deployments to authenticate).
2. **Point `BETTER_AUTH_URL` at the public HTTPS origin.** Preview deployments run with
   `NODE_ENV=production`, so add their origins to `BETTER_AUTH_TRUSTED_ORIGINS` explicitly —
   loopback trust does not apply there.
3. **Allow the host to reach Atlas.** Serverless egress IPs are dynamic, so the cluster's
   network access list has to include them (or use the Vercel/Atlas integration).
4. Node **20.19+** on the host; the default `next build` needs no extra configuration.

## Not included

Deliberately out of scope for now: email-based password reset, social sign-in, two-factor
authentication, roles, shared or household accounts (each account sees only its own data),
JSON import/backup, and a UI language picker.
