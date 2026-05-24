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

`npm run build` currently reaches the Prisma generate step, but Windows keeps the generated Prisma query-engine DLL locked from the local Codex/Node process. Running `npx next build` directly succeeds against the already generated Prisma client.
