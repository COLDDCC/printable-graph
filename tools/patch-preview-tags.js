/* ============================================================================
   tools/patch-preview-tags.js — wire the screenshots from gen-previews.js
   into each page: og:image / twitter:image meta (upgrades twitter:card to
   summary_large_image) plus a real, visible <figure><img> before the tool,
   so the sheet is backed by an actual image resource instead of only a
   canvas the tool draws at runtime.

   Idempotent — running twice leaves already-patched pages untouched.
   Run this after tools/gen-previews.js (or after adding a new page + preview).

       node tools/patch-preview-tags.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';
var manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'previews', 'manifest.json'), 'utf8'));

var ENTITY_MAP = { amp: '&', mdash: '—', ndash: '–', nbsp: ' ', rsquo: '’', lsquo: '‘', quot: '"' };
function decodeEntities(s) {
  return s.replace(/&(amp|mdash|ndash|nbsp|rsquo|lsquo|quot);/g, function (m, name) { return ENTITY_MAP[name]; });
}
function extractH1(html) {
  var m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!m) return null;
  return decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim();
}

var patched = 0, skipped = 0;

Object.keys(manifest).forEach(function (slug) {
  var info = manifest[slug];
  var file = slug ? path.join(ROOT, slug, 'index.html') : path.join(ROOT, 'index.html');
  var html = fs.readFileSync(file, 'utf8');

  if (html.indexOf('og:image') !== -1) { skipped++; return; }

  var h1 = extractH1(html) || 'Printable graph paper';
  var alt = h1 + ' — printable PDF sheet preview';
  var imgUrl = SITE + '/' + info.file;

  html = html.replace(
    /<meta name="twitter:card" content="summary">/,
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta property="og:image" content="' + imgUrl + '">\n' +
    '<meta property="og:image:width" content="' + info.width + '">\n' +
    '<meta property="og:image:height" content="' + info.height + '">\n' +
    '<meta name="twitter:image" content="' + imgUrl + '">'
  );

  var figure = '  <figure class="preview-shot">\n' +
    '    <img src="/' + info.file + '" width="' + info.width + '" height="' + info.height + '" loading="lazy" alt="' + alt.replace(/"/g, '&quot;') + '">\n' +
    '    <figcaption>Example sheet at the default settings below — size, colour and paper all change live.</figcaption>\n' +
    '  </figure>\n\n';

  if (html.indexOf('<div class="tool">') === -1) {
    console.warn('SKIP (no .tool anchor): ' + file);
    return;
  }
  html = html.replace('  <div class="tool">', figure + '  <div class="tool">');

  fs.writeFileSync(file, html);
  patched++;
});

console.log('patched ' + patched + ' pages, skipped ' + skipped + ' (already had og:image)');
