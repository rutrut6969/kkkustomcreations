# K&K Kustom Kreations QA Screenshots

## Captured Baseline Screenshots

The `before/` folder contains the screenshots captured during the initial visual sweep:

- Desktop: home, shop, cart, checkout
- Mobile: home, shop, cart, checkout

## After-Fix Screenshot Note

The in-app browser pane became unavailable during the final QA pass, and local headless Chrome could not connect to the transient Next.js dev server long enough to produce valid after screenshots. Failed connection-error captures were discarded so this folder only contains useful QA artifacts.

## Verified Checks

- `npm run lint`
- `npm run typecheck`
- `npx next build`
- `npm run prisma:deploy`

`npm run build` currently reaches the Prisma generate step, but Windows keeps the generated Prisma query-engine DLL locked from the local Codex/Node process. Running `npx next build` directly succeeds against the already generated Prisma client.

## Production Hardening Pass

For the production hardening pass, `npm install`, `npm run lint`, `npm run typecheck`, `npm run prisma:deploy`, and `npx next build` completed successfully. Local screenshot capture was attempted against `next start`, but the local Windows sandbox could not maintain a reachable connection to the Prisma Postgres host long enough for valid screenshots. Connection-error screenshots were discarded to avoid confusing them with real UI captures.

## Branding / Platform Continuation Pass

The logo/favicon pack was installed under `public/` and wired through root metadata, manifest, header, footer, admin login, admin shell, and checkout. A second screenshot pass was attempted after the branding update, but local `next start` could not stay reachable from the Windows shell session. The code-level production checks passed, and deployment should serve the favicon and manifest assets directly from Vercel static assets.
