# SEO change log

One line per change that could move search results, so a later rise or drop
can be traced to its cause. Judge each change on 28-day GSC windows aligned by
weekday, starting from the day Google recrawled the page (URL Inspection).

**Freeze until 2026-11-13:** pages changed substantively on 2026-10-23 —
`/`, `/1-inch-graph-paper/`, `/1cm-graph-paper/`, `/a3-graph-paper/`,
`/compare-graph-paper-sizes/`, `/coordinate-graph-paper/`, `/dot-grid-paper/`.
Do not change their titles, descriptions or body copy before then.

| Date | Pages | Change | Baseline (GSC, 2026-08-10 → 10-24) | Target |
|---|---|---|---|---|
| 2026-10-15/16 | `/`, new lined/Cornell/handwriting/story pages | Homepage title → "Graph & Lined Paper Generator"; writing-paper generators added | Weekly avg position 12.4 (wk 10-05) | — (post-hoc: position slipped to 16.2, 19.6; under review) |
| 2026-10-23 | `/`, 1 inch, 1 cm, A3, compare, coordinate, dot (+ font loading site-wide) | Titles/meta aimed at GSC queries; homepage title back to "Graph Paper Generator"; how-to-use guide added | 1 inch pos 16.7 · 1 cm pos 24.0 · compare pos 9.2 CTR 0.8% | Evaluate after 2026-11-13 |
| 2026-11-02 | `/print-troubleshooting/`, `/graph-paper-for-teachers/`, `/graph-paper-for-pixel-art/`, `/graph-paper-for-dnd-maps/` | Title + description rewrite (snippet test); teachers page gains Name/Date worksheet PDFs and class sets; D&D page gains 1-inch battle-mat option | Together 332 impressions, 3 clicks (0.9% CTR) | ≥ 3% combined CTR over 28 days |
| 2026-11-02 | `/graph-paper-for-teachers/`, `/graph-paper-templates/` | FAQ JSON-LD fixed (was a bare Question array without `@context`/`FAQPage`); check-site now validates JSON-LD | Invalid structured data | Rich Results Test passes |
| 2026-11-02 | New `/black-graph-paper/`, `/cream-graph-paper/`; all 16 colour variants; 2 mm, 5 mm, 10/in, 1/8, 1/4, 1/2 size pages | Colour hub pages; variants and size pages link to them; broken emoji glyphs removed from variant tables | Variants: 241 impressions, 29 clicks (~12% CTR) | Variants ≥ 40 clicks / 28 days at ≥ 10% CTR; hubs indexed |
| 2026-11-02 | All pages | `_redirects`: 301 from no-slash URLs to canonical slash URLs (was Cloudflare's default 307); sitemap `lastmod` now from git history instead of file mtime | No-slash URL and `/api/pdf` showed in GSC | No non-canonical URLs in GSC pages report after 4 weeks |

## Next (after the freeze)

- 1 cm page: add "1 cm squared paper" and British "centimetre" wording (cluster pos 36.6, 1 click).
- 1 inch page: internal "one inch grid paper" anchors, Letter vs A4 FAQ (query pos 10.6 → target < 6).
- Core sizes 1/4 in, 5 mm, 1/2 in (pos 30–37): content gap review and homepage anchors.
- Backlinks: directories and resource lists, pitched on the measuring bar and the free PDF API.
