# K&K Kustom Kreations

Phase 1/2 storefront for K&K Kustom Kreations, built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Vercel Blob uploads, and Square checkout/payment integrations.

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in deployment secrets. `.env.local` is ignored by git.

For the database, set `DATABASE_URL`. The app also accepts `PRISMA_DATABASE_URL` or `POSTGRES_URL` and maps the first available value into Prisma at runtime.

Square defaults to sandbox unless `SQUARE_ENVIRONMENT=production`. Checkout sends cart items, fulfillment choice, customer contact details, address when needed, notes, and consent metadata.

If `SQUARE_SANDBOX_LOCATION_ID` or `SQUARE_PRODUCTION_LOCATION_ID` is omitted, the checkout route attempts to discover an active Square location from the configured access token.

## Data

The app uses Prisma with a PostgreSQL-ready schema. Prisma CLI commands still expect `DATABASE_URL`, so if your provider gives `PRISMA_DATABASE_URL` or `POSTGRES_URL`, copy that same value into `DATABASE_URL` before running migrations:

```bash
npm run prisma:migrate
```

On Vercel, the configured build command runs:

```bash
npm run prisma:deploy && npm run build
```

That applies checked-in migrations, then builds the site. Make sure `DATABASE_URL` is set in Vercel before redeploying.

Seed/demo data has been removed. Products, categories, settings, posts, events, messages, orders, and social proof should come from Prisma/Square/admin-created records. When `DATABASE_URL` is not configured or a query fails, pages render empty/default states instead of fake products or orders.

## Admin

Set:

```bash
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Then visit `/admin`. Plain text passwords are supported for quick setup; bcrypt hashes are also accepted for deployment.

## Verification

Useful checks:

```bash
npm run typecheck
npm run build
```
