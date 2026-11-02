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

var EXCLUDE_DIRS = ['.git', '.wrangler', 'tools', 'assets', 'node_modules', 'worker', 'artifacts'];

// Preview screenshots keyed by slug ('' = home), written by tools/gen-previews.js.
var previewManifestPath = path.join(ROOT, 'assets', 'previews', 'manifest.json');
var previews = fs.existsSync(previewManifestPath) ? JSON.parse(fs.readFileSync(previewManifestPath, 'utf8')) : {};

// Priority tiers by URL path.
function priority(urlPath) {
  if (urlPath === '/') return '1.0';
  if (/graph-paper\/$/.test(urlPath)) return '0.8';            // the 8 size pages
  if (/\/(black|cream)\/$/.test(urlPath)) return '0.7';        // colour variants
  if (/graph-paper-(black|cream|for-|for-)/.test(urlPath)) return '0.6';
  return '0.6';                                                // tool + paper + use pages
}

// lastmod = the date the page last really changed, not the file's mtime (a fresh
// clone or CI checkout gives every file today's mtime, which tells Google that
// all 50 pages changed at once). Uncommitted edits count as today; committed
// pages use their last commit date; otherwise keep the date already in sitemap.xml.
var execSync = require('child_process').execSync;
var today = new Date().toISOString().slice(0, 10);
var previous = {};
var oldMap = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(oldMap)) {
  var re = /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g, m;
  var xml = fs.readFileSync(oldMap, 'utf8');
  while ((m = re.exec(xml))) previous[m[1]] = m[2];
}
function git(cmd) {
  try { return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (e) { return null; }
}
function lastmodFor(file, urlPath) {
  var rel = path.relative(ROOT, file);
  var dirty = git('git status --porcelain -- "' + rel + '"');
  if (dirty === null) return fs.statSync(file).mtime.toISOString().slice(0, 10);
  if (dirty) return today;
  return git('git log -1 --format=%cs -- "' + rel + '"') || previous[SITE + urlPath] ||
         fs.statSync(file).mtime.toISOString().slice(0, 10);
}

var urls = [{ path: '/', slug: '', lastmod: lastmodFor(path.join(ROOT, 'index.html'), '/') }];

fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (d) {
  if (!d.isDirectory()) return;
  if (EXCLUDE_DIRS.indexOf(d.name) !== -1) return;
  var idx = path.join(ROOT, d.name, 'index.html');
  if (!fs.existsSync(idx)) return;
  urls.push({ path: '/' + d.name + '/', slug: d.name, lastmod: lastmodFor(idx, '/' + d.name + '/') });
});

urls.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });

var out = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
urls.forEach(function (u) {
  var preview = previews[u.slug];
  out += '  <url>\n' +
         '    <loc>' + SITE + u.path + '</loc>\n' +
         '    <lastmod>' + u.lastmod + '</lastmod>\n' +
         '    <changefreq>monthly</changefreq>\n' +
         '    <priority>' + priority(u.path) + '</priority>\n' +
         (preview ? '    <image:image><image:loc>' + SITE + '/' + preview.file + '</image:loc></image:image>\n' : '') +
         '  </url>\n';
});
out += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out);
console.log('sitemap.xml written with ' + urls.length + ' URLs');