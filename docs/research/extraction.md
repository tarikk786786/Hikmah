# Main Content Extraction & Cleaning

Web pages contain up to 80% non-content boilerplate (headers, footers, navigation, cookie banners, advertisements, tracking pixels).
Hikmah removes this noise before LLM ingestion.

---

## 1. Trafilatura Algorithms (`TrafilaturaExtractor`)

The extraction pipeline:
1. Strips `<script>`, `<style>`, `<noscript>`, `<nav>`, `<footer>`, `<aside>`, `<header>`, and `<svg>` elements.
2. Removes comment sections and cookie consent banners (`cookie-banner`, `popup`, `modal`).
3. Evaluates text density across `<article>` and `<main>` blocks to identify authentic article prose.
4. Preserves semantic headings (`h1`-`h4`) and tables.
5. Extracts author metadata, publication dates, and site titles.

---

## 2. Document Extraction (`DocumentExtractor`)

For binary assets:
- **PDFs**: Text extraction preserving page numbers for citation coordinate mapping (`[p. 14]`).
- **Markdown / Plain Text**: Clean pass-through with encoding normalization (`UTF-8`).
