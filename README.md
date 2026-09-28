# TreyBrunson.com

Personal Website for [Trey Brunson](https://treybrunson.com/).

## Background

Trey Brunson is a Bitcoin industry professional with a decade of experience working across crypto exchanges, Bitcoin financial products, and crypto venture funds.

## Contact

Connect with [Trey Brunson on LinkedIn](https://www.linkedin.com/in/trey-brunson).

## Project structure

```text
Trey-Brunson-Website/
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── app/
│   ├── api/bitcoin/route.ts
│   ├── SupplyHeroModule.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── public/
│   ├── favicon.png
│   ├── og.jpg
│   └── trey-headshot.webp
├── tests/
│   └── market.test.mjs  # API validation, CSP, polling and freshness labels
├── .nvmrc
├── eslint.config.mjs
├── LICENSE
├── SECURITY.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── proxy.ts             # Per-request Content Security Policy and script nonce
├── tsconfig.json
└── README.md
```

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- CSS Grid, Flexbox, custom properties, and responsive media queries
- Native Next.js image and font optimization
- Vercel-compatible security headers and production build

## Live Bitcoin data

The hero market module requests data from the internal `/api/bitcoin` route. That route retrieves the current block height and USD price from the public mempool.space API, validates both responses, and exposes a same-origin response that shared caches may hold for 30 seconds plus up to 30 seconds while revalidating.

- **Bitcoin price** comes from the mempool.space USD price response.
- **Bitcoin supply** is calculated from the current block height and Bitcoin's 210,000-block subsidy schedule.
- **Market cap** is the current USD price multiplied by calculated issued supply.
- The browser refreshes the module every 60 seconds, starting each refresh only after the previous one finishes.
- **Live** labels expire when the price is more than 15 minutes old or the network data more than 5 minutes old, and after any failed refresh; the values then read **Last known**. Ages are measured on the server's clock, so a visitor whose device clock is wrong still sees the correct label.

## Requirements

- Node.js 24 (`.nvmrc` and `engines.node`)
- pnpm 11.19.0 (`packageManager`)

## Local development

```bash
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Next.js serves the local site at [http://localhost:3000](http://localhost:3000) by default.

## Validation

Run the complete pre-push validation sequence:

```bash
pnpm lint
pnpm audit --prod
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions runs the same sequence — lint, a production dependency audit that fails on high-severity advisories, type checking, tests, and the production build — on every pull request and every push to `main`.

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
