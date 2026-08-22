# TreyBrunson.com

Personal Website for [Trey Brunson](https://treybrunson.com/).

## Contact

Connect with [Trey Brunson on LinkedIn](https://www.linkedin.com/in/trey-brunson).

## Background

Trey Brunson is a Bitcoin industry professional with a decade of experience spanning exchange operations, institutional financial products, and crypto venture funds. He is the founder of [Secret Satoshis](https://secretsatoshis.com/), an open, verifiable, AI-native Bitcoin intelligence platform.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- CSS Grid, Flexbox, custom properties, and responsive media queries
- Native Next.js image and font optimization
- Vercel-compatible security headers and production build

## Live Bitcoin data

The hero market module requests data from the internal `/api/bitcoin` route. That route retrieves the current block height and USD price from the public mempool.space API, validates both responses, and exposes a same-origin response cached for 60 seconds.

- **Bitcoin price** comes from the mempool.space USD price response.
- **Bitcoin supply** is calculated from the current block height and Bitcoin's 210,000-block subsidy schedule.
- **Market cap** is the current USD price multiplied by calculated issued supply.
- The browser refreshes the module every 60 seconds.

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
pnpm typecheck
pnpm build
pnpm audit --prod
```

GitHub Actions runs lint, type checking, and the production build on every pull request and every push to `main`.

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
│   ├── og.png
│   └── trey-headshot.webp
├── LICENSE
├── SECURITY.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
