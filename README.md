# savery-portfolio

Personal site for Dustin Savery. Astro + React islands + TypeScript, plain CSS, deployed static to GitHub Pages. Ships almost no JavaScript — the only React island is the interactive Filter demo.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
npm run preview  # preview the production build
```

Requires Node 18+ (the deploy uses Node 24).

## Editing content

Almost everything lives in **`src/data/site.ts`** — name, intro, social links, the work list, experience, and skills. Edit that file and push; no markup needed.

- **Add a project** → add an entry to the `work` array. `href` can be an internal case-study path (`/work/…`) or an external URL.
- **Add a case study** → copy `src/pages/work/filter.astro` to a new file in `src/pages/work/`, then point a `work` entry's `href` at it.
- **Design tokens** (colors, fonts) → `src/styles/global.css` (the `:root` block).

## Structure

```
src/
  data/site.ts            ← edit this for content
  styles/global.css       ← tokens, fonts, shared classes, animations
  layouts/Base.astro      ← <head>, fonts, the one enhancement script
  components/FilterDemo.tsx← the React island (query engine)
  pages/index.astro       ← home
  pages/work/filter.astro ← Filter case study
public/                   ← favicon, CNAME, static assets
```

## Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The site builds and deploys automatically.

### Domain / base path
- **Custom domain** (dustinsavery.com): keep `public/CNAME`, and in your DNS point the domain at GitHub Pages. `site` in `astro.config.mjs` is already set.
- **User site** (`username.github.io`): delete `public/CNAME`, set `site` to that URL, leave `base` off.
- **Project site** (`username.github.io/repo`): delete `public/CNAME`, set `site` accordingly, and uncomment/set `base: '/repo'` in `astro.config.mjs`.
