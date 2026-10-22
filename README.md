# Personal Website

Static personal website hosted on GitHub Pages.

## Structure

- `index.html` — main page
- `assets/css/style.css` — styles
- `.nojekyll` — tells GitHub Pages to serve files as-is (no Jekyll build)

## Local preview

Open `index.html` in a browser, or run a local server:

```sh
python -m http.server 8000
```

then visit http://localhost:8000.

## Deploy

Push to the `main` branch, then in the GitHub repo go to
**Settings → Pages → Build and deployment**, choose **Deploy from a branch**,
and select `main` / `(root)`.
