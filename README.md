# PDF Dictionary App

This repository now contains two versions of the same PDF reading project:

- `pdf_dictionary_app/`: the original SwiftUI iOS/iPadOS app
- `web/`: a browser-based version that runs on iPad Safari without native installation requirements

## Web version

The web app supports:

- local PDF import in the browser
- nested folders for organizing documents
- PDF viewing with `pdf.js`
- word selection and dictionary lookup
- simple reading and vocabulary insights

See [`web/README.md`](web/README.md) for deployment notes.

## iOS version

The original Swift app remains in `pdf_dictionary_app/` and uses SwiftUI plus PDFKit for the reader experience.
