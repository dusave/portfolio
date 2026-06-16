# savery-v3

Personal site for Dustin Savery. Astro shell, content pre-rendered for speed/SEO, with the scroll-driven motion experience as a single hydrated React island. Dark editorial aesthetic, neon pink/blue, scrubbed scroll transitions, an interactive recreation of the GitHub Filter component, and a confetti toy's worth of personality.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
npm run preview
```

## Architecture — three layers

1. **Content** → `src/data/site.ts`. Roles (the CHANGELOG), contact links, and the Filter demo's suggestion pools. **This is the file you edit most.** Add a job = add a row to `ROLES`.
2. **Engine + scenes** → `src/components/MotionSite.jsx`. The scroll-scrubbing engine (one `requestAnimationFrame` loop reading scroll progress), the five scenes, their transitions (diagonal wipe / iris / slot / curtain), the soft elastic snap, and the embedded Filter demo + mobile fallback.
3. **Shell** → `src/layouts/Base.astro` + `src/pages/index.astro`. Static HTML, fonts, meta; mounts the island with `client:load`.

One-off animated copy (the hero headline, the typed `target?.value`) intentionally lives *in the scene*, not in `site.ts` — it's meaningless without its animation. Listy/repeating content lives in data. That split is deliberate.

## Editing

- **Add/edit a job** → `ROLES` in `src/data/site.ts`.
- **Change contact links** → `site` in `src/data/site.ts`.
- **Filter suggestions** (authors, labels, qualifiers) → same file.
- **Re-choreograph a scene** → that scene in `MotionSite.jsx`.
- **Colors** → the `PINK`/`BLUE`/… consts at the top of `MotionSite.jsx`.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds + deploys on every push to `main`.
1. Push to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Custom domain: keep `public/CNAME`, point DNS at Pages. Otherwise delete it (and set `base` in `astro.config.mjs` for a project repo).

## Recommended next refactors (good first tasks for an agent)

The motion island is proven but monolithic — it was ported wholesale from the working prototype. To finish the three-layer ideal:

1. **Extract `useScrollScene`** — pull the rAF loop + progress math + snap logic out of `MotionSite.jsx` into `src/lib/useScrollScene.ts`. Each scene should receive its own progress value rather than the engine reaching into refs.
2. **Split scenes into components** — `Hero.jsx`, `Work.jsx`, `Language.jsx`, `Changelog.jsx`, `Contact.jsx`, each owning its markup + choreography, composed in `MotionSite.jsx`.
3. **Move the Filter** — `FilterDemo.jsx` + `FilterMobile.jsx` into their own files (the parser already reads pools from `site.ts`).
4. **Mobile mode flag** — formalize the `useIsMobile` branch into a per-scene `reduced` choreography prop rather than ad-hoc checks.
5. **Convert `MotionSite.jsx` → `.tsx`** and type the scene/engine interfaces once the above split makes them small enough to type cleanly.
6. **Asset pipeline / perf budget** — only when heavy assets (commissioned avatar `.glb`, real audio samples, OG image) get added. Add a Lighthouse check to CI then.

These are intentionally deferred so the site ships first and refactors land against a working, deployed baseline.
