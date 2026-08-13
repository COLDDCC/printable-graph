/* ============================================================================
   tools/gen-sitemap.js — rebuild sitemap.xml from the page folders on disk.
   Run after creating or deleting any page.

       node tools/gen-sitemap.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';

// Priority tiers by URL path.
function priority(urlPath) {
  if (urlPath === '/') return '1.0';
  if (/graph-paper\/$/.test(urlPath)) return '0.8';            // the 8 size pages
  if (/\/(black|cream)\/$/.test(urlPath)) return '0.7';        // colour variants
  if (/graph-paper-(black|cream|for-|for-)/.test(urlPath)) return '0.6';
  return '0.6';                                                // tool + paper + use pages
}

var urls = [{ path: '/', lastmod: fs.statSync(path.join(ROOT, 'index.html')).mtime.toISOString().slice(0, 10) }];

fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (d) {
  if (!d.isDirectory()) return;
  if (d.name === '.git' || d.name === '.wrangler' || d.name === 'tools' || d.name === 'assets') return;
  var idx = path.join(ROOT, d.name, 'index.html');
  if (!fs.existsSync(idx)) return;
  var lastmod = fs.statSync(idx).mtime.toISOString().slice(0, 10);
  urls.push({ path: '/' + d.name + '/', lastmod: lastmod });
});

urls.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });

var out = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
urls.forEach(function (u) {
  out += '  <url>\n' +
         '    <loc>' + SITE + u.path + '</loc>\n' +
         '    <lastmod>' + u.lastmod + '</lastmod>\n' +
         '    <changefreq>monthly</changefreq>\n' +
         '    <priority>' + priority(u.path) + '</priority>\n' +
         '  </url>\n';
});
out += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out);
console.log('sitemap.xml written with ' + urls.length + ' URLs');