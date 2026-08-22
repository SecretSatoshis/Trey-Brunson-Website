# Trey Brunson

Personal website for [Trey Brunson](https://treybrunson.com/), focused on a decade of work across the Bitcoin industry and the projects making Bitcoin easier to understand and access.

The site is a production-ready Next.js application intended for deployment through Vercel from a public GitHub repository.

## Site structure

1. **Hero** — positioning, biography summary, selected experience, and live Bitcoin market data.
2. **Bitcoin perspective** — the long-term thesis and three operating principles.
3. **Selected work** — Secret Satoshis, Agent 21, and the Bitcoin Chart Library.
4. **About** — background, experience, and current focus.
5. **Connect** — LinkedIn and Secret Satoshis calls to action.

The discarded design-exploration route is intentionally excluded from the production application.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- CSS Grid, Flexbox, custom properties, and responsive media queries
- Native Next.js image and font optimization
- Vercel-compatible security headers and production build

The site has no database, authentication, environment variables, analytics package, or client-side tracking.

## Live Bitcoin data

The hero market module requests data from the internal `/api/bitcoin` route. That route retrieves the current block height and USD price from the public mempool.space API, validates both responses, and exposes a same-origin response cached for 60 seconds.

- **Bitcoin price** comes from the mempool.space USD price response.
- **Bitcoin supply** is calculated from the current block height and Bitcoin's 210,000-block subsidy schedule.
- **Market cap** is the current USD price multiplied by calculated issued supply.
- The browser refreshes the module every 60 seconds.
- When fresh data is unavailable, the interface shows the last valid value or an unavailable state instead of presenting hard-coded market data as live.

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

## Metadata and discovery

The application includes:

- Canonical metadata for `https://treybrunson.com/`
- Open Graph and X large-image metadata
- A 1200×630 social preview card
- `Person` and `WebSite` JSON-LD structured data
- Generated `robots.txt` and `sitemap.xml` routes
- A branded favicon and custom 404 page
- Search-engine indexing rules and large-image preview support

## Accessibility and security

- Semantic header, main, section, article, navigation, and footer landmarks
- One page-level `h1` followed by hierarchical section headings
- Keyboard-visible focus states and a skip-to-content link
- Reduced-motion support
- Responsive layouts without horizontal overflow
- Safe external-link attributes
- Content Security Policy, anti-framing, MIME-sniffing protection, referrer policy, and restrictive browser permissions
- Upstream response validation and an eight-second API timeout

Please report security issues through GitHub's private vulnerability-reporting feature as described in [SECURITY.md](SECURITY.md).

## Vercel deployment

Vercel supports this project as a native Next.js application with no adapter or custom output directory.

1. Push the repository's `main` branch to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Confirm **Framework Preset: Next.js** and **Root Directory: `./`**.
4. Leave the install, build, and output settings on their detected defaults.
5. Confirm **Node.js Version: 24.x** and deploy.
6. Add `treybrunson.com` and `www.treybrunson.com` under **Settings → Domains**.
7. Make `treybrunson.com` the primary domain and redirect `www` to it.
8. Apply the DNS records Vercel provides, then verify HTTPS, canonical metadata, the live market module, `/robots.txt`, and `/sitemap.xml`.

No Vercel environment variables are required.

## Project structure

```text
TreyBrunson-Website/
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

Licensed under the [GNU General Public License v3.0](LICENSE), matching the Secret Satoshis public website repository.
