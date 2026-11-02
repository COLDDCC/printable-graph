/* ============================================================================
   tools/gen-color-hubs.js — writes /black-graph-paper/ and /cream-graph-paper/,
   one hub per background colour that links all eight size variants.

       node tools/gen-color-hubs.js

   Why: in Search Console the colour variants convert far better than the site
   average (about 12% CTR vs 2.5%, Aug–Oct 2026), but each variant only had two
   internal links. The hub gives "black graph paper" / "cream graph paper" a
   landing page and passes links to every variant. Copy comes from the shared
   COLORS / SIZES data in gen-color-pages.js so the two stay consistent.
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var data = require('./gen-color-pages.js');

var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';
var manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/previews/manifest.json'), 'utf8'));

// API size keys for each size page slug (see llms.txt).
var API_SIZE = {
  '2mm-graph-paper': '2mm', '5mm-graph-paper': '5mm', '1cm-graph-paper': '1cm',
  'eighth-inch-graph-paper': 'eighth-inch', 'quarter-inch-graph-paper': 'quarter-inch',
  'half-inch-graph-paper': 'half-inch', '10-squares-per-inch-graph-paper': '10-per-inch',
  '1-inch-graph-paper': '1-inch'
};
// Display order: metric first, then inch sizes from fine to coarse.
var ORDER = ['2mm-graph-paper', '5mm-graph-paper', '1cm-graph-paper', '10-squares-per-inch-graph-paper',
  'eighth-inch-graph-paper', 'quarter-inch-graph-paper', 'half-inch-graph-paper', '1-inch-graph-paper'];

var HUB = {
  black: {
    title: 'Black Graph Paper — Free Printable PDF, White Grid on Black (8 Sizes)',
    desc: 'Free printable black graph paper: a white grid on a near-black page in 2 mm, 5 mm, 1 cm, 1/8, 1/4, 1/2 and 1 inch squares or 10 per inch. A4 or Letter PDF, true to size, no signup.',
    eyebrow: 'White lines on a near-black page',
    h1: 'Black graph paper',
    sizesLede: 'Same grid geometry as the white sheets, only the background changes. Open a size to customise it, or download the PDF straight away.',
    pens: 'Write on it with a white gel pen, a metallic or silver marker, or a white pencil. Regular graphite barely shows on black.',
    other: 'cream'
  },
  cream: {
    title: 'Cream Graph Paper — Free Printable Warm-Tint Grid PDF (8 Sizes)',
    desc: 'Free printable cream graph paper: a warm, low-glare tint with a dark brown grid in 2 mm, 5 mm, 1 cm, 1/8, 1/4, 1/2 and 1 inch squares or 10 per inch. A4 or Letter PDF, true to size.',
    eyebrow: 'A warm tint that is easier on the eyes',
    h1: 'Cream graph paper',
    sizesLede: 'Same grid geometry as the white sheets, only the paper tint changes. Open a size to customise it, or download the PDF straight away.',
    pens: 'Pencil, fountain pen and sepia or brown inks all read well on the cream tint, so it suits journaling and long study sessions.',
    other: 'black'
  }
};

function esc(s) { return String(s).replace(/&(?!amp;|mdash;|times;|nbsp;|middot;|rsquo;)/g, '&amp;'); }

function build(key) {
  var col = data.COLORS[key], hub = HUB[key], other = data.COLORS[hub.other];
  var slug = key + '-graph-paper', url = SITE + '/' + slug + '/';
  var sizes = ORDER.map(function (s) { return data.SIZES.filter(function (x) { return x.slug === s; })[0]; });

  var rows = sizes.map(function (s) {
    var page = '/' + s.slug + '-' + key + '/';
    var api = '/api/pdf?size=' + API_SIZE[s.slug] + '&amp;background=' + key;
    return '          <tr><th scope="row"><a href="' + page + '">' + col.display + ' ' + s.mono + '</a></th>' +
      '<td>' + s.use + '</td>' +
      '<td><a href="' + api + '&amp;paper=a4">A4</a> &middot; <a href="' + api + '&amp;paper=letter">Letter</a></td></tr>';
  }).join('\n');

  var gallery = sizes.map(function (s) {
    var v = s.slug + '-' + key, m = manifest[v];
    if (!m) return '';
    return '      <a href="/' + v + '/"><img src="/' + m.file + '" width="' + m.width + '" height="' + m.height +
      '" loading="lazy" alt="' + col.display + ' ' + s.mono + ' graph paper — printable sheet preview"><span>' + s.mono + '</span></a>';
  }).filter(Boolean).join('\n');

  var uses = col.uses.map(function (u) { return '      <div><h3>' + u[0] + '</h3><p>' + u[1] + '</p></div>'; }).join('\n');
  var tech = col.tech.map(function (t) { return '        <li>' + t + '</li>'; }).join('\n');

  // Colour questions only (the per-size ruler question lives on each variant page).
  var faq = data.buildFaq(sizes[0], col).slice(0, -1);
  faq.push({ q: 'Which square size should I pick?',
    a: '5 mm (metric) or 1/4 inch (US) is the everyday notebook grid. Go finer, 2 mm or 10 per inch, for detailed plotting; go bigger, 1 cm, 1/2 inch or 1 inch, for young learners, floor plans and anything you want to read from a distance.' });
  var faqHtml = faq.map(function (r, i) {
    return '      <details' + (i === 0 ? ' open' : '') + '><summary>' + r.q + '</summary><p>' + r.a + '</p></details>';
  }).join('\n');
  var ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: hub.h1.charAt(0).toUpperCase() + hub.h1.slice(1), url: url,
        hasPart: sizes.map(function (s) { return { '@type': 'WebPage', name: col.display + ' ' + s.mono + ' graph paper', url: SITE + '/' + s.slug + '-' + key + '/' }; }) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Graph paper', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: col.display + ' graph paper', item: url } ] },
      { '@type': 'FAQPage', mainEntity: faq.map(function (r) {
        return { '@type': 'Question', name: r.q, acceptedAnswer: { '@type': 'Answer', text: r.a } }; }) }
    ]
  };

  var html = [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'',
'<title>' + hub.title + '</title>',
'<meta name="description" content="' + hub.desc + '">',
'<link rel="canonical" href="' + url + '">',
'',
'<meta property="og:type" content="website">',
'<meta property="og:title" content="' + hub.title + '">',
'<meta property="og:description" content="' + hub.desc + '">',
'<meta property="og:url" content="' + url + '">',
'<meta property="og:image" content="' + SITE + '/' + manifest['5mm-graph-paper-' + key].file + '">',
'<meta name="twitter:card" content="summary_large_image">',
'',
'<link rel="icon" href="/favicon.ico" sizes="any">',
'<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">',
'<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">',
'<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">',
'<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
'',
'<link rel="preconnect" href="https://fonts.googleapis.com">',
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
'<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap">',
'<link href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media=\'all\'">',
'<noscript><link href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet"></noscript>',
'',
'<link rel="stylesheet" href="/assets/site.css">',
'',
'<!-- Google tag (gtag.js) -->',
'<script async src="https://www.googletagmanager.com/gtag/js?id=G-WFH3F9TQCN"></script>',
'<script>',
'  window.dataLayer = window.dataLayer || [];',
'  function gtag(){dataLayer.push(arguments);}',
'  gtag(\'js\', new Date());',
'  gtag(\'config\', \'G-WFH3F9TQCN\');',
'</script>',
'</head>',
'<body>',
'',
'<header>',
'  <div class="wrap mast">',
'    <a class="brand" href="/">',
'      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="#fff" stroke="#C3CDD2"/><g stroke="#4A7FB5" stroke-width="1"><path d="M4.5 0v16M8.5 0v16M12.5 0v16M0 4.5h16M0 8.5h16M0 12.5h16"/></g></svg>',
'      Graph Paper',
'    </a>',
'    <nav>',
'      <a href="#sizes">Sizes</a>',
'      <a href="#uses">Uses</a>',
'      <a href="#faq">FAQ</a>',
'    </nav>',
'  </div>',
'</header>',
'',
'<main class="wrap">',
'',
'  <p class="crumb"><a href="/">Graph paper</a><span>/</span>' + key + ' graph paper</p>',
'',
'  <div class="hero size compact">',
'    <div>',
'      <p class="eyebrow">' + hub.eyebrow + '</p>',
'      <h1>' + hub.h1 + '</h1>',
'      <p class="lede">' + col.lead + '</p>',
'    </div>',
'    <div class="quick-dl">',
'      <a class="cta" href="/api/pdf?size=5mm&amp;paper=a4&amp;background=' + key + '">Download 5 mm PDF &middot; A4</a>',
'      <a class="quick-alt" href="/api/pdf?size=quarter-inch&amp;paper=letter&amp;background=' + key + '">1/4 in &middot; Letter</a>',
'    </div>',
'  </div>',
'',
'  <section id="sizes">',
'    <div class="sec-hd">',
'      <h2>' + col.display + ' graph paper in every size</h2>',
'      <p class="sec-lede">' + hub.sizesLede + '</p>',
'    </div>',
'    <div class="tscroll">',
'      <table class="facts">',
'        <caption>' + col.display + ' sheets</caption>',
'        <thead><tr><th scope="col">Size</th><th scope="col">Best for</th><th scope="col">PDF</th></tr></thead>',
'        <tbody>',
rows,
'        </tbody>',
'      </table>',
'    </div>',
'    <div class="hub-gallery">',
gallery,
'    </div>',
'  </section>',
'',
'  <section id="uses">',
'    <div class="sec-hd">',
'      <h2>What ' + key + ' graph paper is for</h2>',
'      <p class="sec-lede">' + hub.pens + '</p>',
'    </div>',
'    <div class="uses">',
uses,
'    </div>',
'    <ul class="hub-specs">',
tech,
'    </ul>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about ' + key + ' graph paper</h2></div>',
'    <div class="faq">',
faqHtml,
'    </div>',
'  </section>',
'',
'  <div class="sibcol">',
'    <strong>Other colours</strong>',
'    <a href="/' + hub.other + '-graph-paper/">' + other.display + '</a>',
'    <a href="/5mm-graph-paper/">White</a>',
'  </div>',
'',
'  <footer>',
'    <span>Graph paper, generated in your browser. Nothing is uploaded.</span>',
'    <span>&copy; 2026</span>',
'    <span><a href="mailto:hello@printgridpaper.com">Something wrong with a sheet? Tell me.</a>',
'      &nbsp;&middot;&nbsp; <a href="/print-troubleshooting/">Print help</a></span>',
'  </footer>',
'</main>',
'',
'<script type="application/ld+json">',
JSON.stringify(ld, null, 2),
'</script>',
'</body>',
'</html>',
''].join('\n');

  var dir = path.join(ROOT, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return slug;
}

console.log('Wrote ' + ['black', 'cream'].map(build).join(', '));
