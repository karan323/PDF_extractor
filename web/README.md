# PDF Dictionary Web

This folder contains a browser-based version of the Swift PDF dictionary app.

## What it does

- Imports PDF files directly in the browser
- Stores your library locally with `IndexedDB`
- Supports nested folders
- Renders PDFs with `pdf.js`
- Lets you select a word in the PDF and fetch a definition
- Tracks reading minutes and word lookup activity
- Works well on iPad in Safari once deployed as a normal website

## Why this fits the iPad requirement

There is no Xcode build, no Swift runtime, and no native app install requirement. This is just a static website.

## How to use it

1. Host the `web` folder on any static host such as GitHub Pages, Netlify, Cloudflare Pages, or Vercel.
2. Open the deployed URL on the iPad in Safari.
3. Optionally use Safari's **Add to Home Screen** feature to make it feel like an app.

## Notes

- PDFs are stored in the browser for the current site, not in iCloud Files.
- Browser storage limits still apply, especially on iPadOS.
- Dictionary lookups use a public online dictionary API, so internet access is needed for definitions.
- Because the app imports ES modules and CDN assets, it should be served over HTTP/HTTPS rather than opened as a raw `file://` page.
