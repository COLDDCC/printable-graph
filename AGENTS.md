# PrintGridPaper UI contract

The core generator has priority over introductions, SEO copy, promotions and new features.
On the homepage, users must select 5 mm or 1/4 inch spacing, choose A4 or Letter,
and download the configured PDF without scrolling. Keep advanced parameters collapsed.
Desktop uses compact controls on the left and a live sheet on the right; mobile
puts core controls and downloads first. Do not hide or remove existing capabilities.

Before any UI change is merged:
- Run `npm test` and `npm run test:ux`.
- Generate and inspect the first-screen PNGs in `artifacts/core-workflow/` at
  1280x720, 1366x768 and 390x844.
- Fix off-screen or obscured core controls, horizontal overflow and failed exports.
- Keep template libraries and SEO content below the generator.

The `Core workflow / zero-scroll` Actions job should be required by repository
branch protection. A workflow alone does not enforce GitHub merge restrictions.
