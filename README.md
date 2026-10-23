# Personal Website

Personal website built with [Astro](https://astro.build) and hosted on GitHub Pages
at https://coltonweeding.com.

## Structure

- `src/pages/index.astro` — home page
- `src/layouts/Layout.astro` — shared page shell (head, header, footer)
- `src/components/ProjectCard.astro` — one project entry
- `src/data/projects.ts` — project list; add a project here
- `src/styles/global.css` — site styles
- `public/` — static files copied as-is (favicon, images, `CNAME`)

## Development

Requires Node.js 22.23.4 or newer.

```sh
npm install
npm run dev      # local dev server at http://localhost:4321
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and
deploys it to GitHub Pages.

## Battle Arena record (Cloudflare Worker)

`worker/` is a Cloudflare Worker with a D1 database that stores the Battle
Arena's all-time win/loss record. Its URL goes in `recordApi` in
`src/data/site.ts`.

```sh
cd worker
npm install
npx wrangler login
npx wrangler d1 create pokemon-record   # put the printed database_id in wrangler.jsonc
npm run migrate:remote
npm run deploy
```
