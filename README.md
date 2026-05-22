# K&K Kustom Kreations

Phase 1 MVP storefront for K&K Kustom Kreations, built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and Square-hosted checkout.

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in deployment secrets. `.env.local` is ignored by git.

For the database, set `DATABASE_URL`. The app also accepts `PRISMA_DATABASE_URL` or `POSTGRES_URL` and maps the first available value into Prisma at runtime.

Square defaults to sandbox unless `SQUARE_ENVIRONMENT=production`. Checkout uses Square-hosted payment links and sends cart items, fulfillment choice, customer contact details, address when needed, notes, and consent metadata.

If `SQUARE_SANDBOX_LOCATION_ID` or `SQUARE_PRODUCTION_LOCATION_ID` is omitted, the checkout route attempts to discover an active Square location from the configured access token.

## Data

The app uses Prisma with a PostgreSQL-ready schema. Prisma CLI commands still expect `DATABASE_URL`, so if your provider gives `PRISMA_DATABASE_URL` or `POSTGRES_URL`, copy that same value into `DATABASE_URL` before running migrations:

```bash
npm run prisma:migrate
npm run db:seed
```

When `DATABASE_URL` is not configured, public pages use built-in sample data so the site still renders for demos. Admin persistence and inboxes require a database.

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
