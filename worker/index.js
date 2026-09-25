/* ============================================================================
   worker/index.js — the Cloudflare Worker in front of the static site.

   Serves GET /api/pdf: the same PDF the page's Download button builds, but
   from a plain URL, so a script, an AI agent or a link in a lesson plan can
   fetch a sheet without running the page's JavaScript. Every other path falls
   through to the static assets.

   The PDF comes from assets/grid-engine.js, the file the browser uses, so the
   two cannot drift apart. The parameter reference is /llms.txt and
   /openapi.json.
   ========================================================================== */
import GridEngine from '../assets/grid-engine.js';

/* Named sizes, matching each size page's default sheet. */
export const SIZES = {
  '2mm':          { spacing: 2,     unit: 'mm', majorEvery: 5,  paper: 'a4' },
  '5mm':          { spacing: 5,     unit: 'mm', majorEvery: 5,  paper: 'a4' },
  '1cm':          { spacing: 10,    unit: 'mm', majorEvery: 10, paper: 'a4' },
  '10-per-inch':  { spacing: 0.1,   unit: 'in', majorEvery: 10, paper: 'letter' },
  'eighth-inch':  { spacing: 0.125, unit: 'in', majorEvery: 8,  paper: 'letter' },
  'quarter-inch': { spacing: 0.25,  unit: 'in', majorEvery: 4,  paper: 'letter' },
  'half-inch':    { spacing: 0.5,   unit: 'in', majorEvery: 2,  paper: 'letter' },
  '1-inch':       { spacing: 1,     unit: 'in', majorEvery: 0,  paper: 'letter' }
};

/* Line colours offered on the site's swatches. */
const COLORS = {
  blue: '#4A7FB5', green: '#5F8A6E', grey: '#9AA6AD', gray: '#9AA6AD',
  black: '#12171B', red: '#C4452F'
};

/* Paper backgrounds, matching the black and cream page variants. */
const BACKGROUNDS = {
  white: { bg: null,      color: null,      calibInk: '#14181C' },
  black: { bg: '#12171B', color: '#FFFFFF', calibInk: '#E8E8E8' },
  cream: { bg: '#F7F1E3', color: '#6B5B41', calibInk: '#4A4238' }
};

const LIMITS = { mm: [1, 50], in: [0.04, 2] };
const MAX_PAGES = 25;

class BadRequest extends Error {}

function pick(v, allowed, name) {
  if (allowed.indexOf(v) === -1) {
    throw new BadRequest(name + ' must be one of: ' + allowed.join(', '));
  }
  return v;
}

function num(v, name, lo, hi) {
  const x = Number(v);
  if (v === '' || !isFinite(x) || x < lo || x > hi) {
    throw new BadRequest(name + ' must be a number from ' + lo + ' to ' + hi);
  }
  return x;
}

function bool(v, name) {
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (/^(0|false|no|off)$/i.test(v)) return false;
  throw new BadRequest(name + ' must be true or false');
}

/* Query string -> grid-engine options. Throws BadRequest on bad input. */
export function parseOptions(q) {
  const sizeKey = q.get('size');
  const size = sizeKey ? SIZES[pick(sizeKey, Object.keys(SIZES), 'size')] : SIZES['5mm'];
  const o = {
    paper: size.paper, orientation: 'portrait', spacing: size.spacing, unit: size.unit,
    majorEvery: size.majorEvery, calibration: true, color: COLORS.blue, pages: 1
  };

  if (q.has('spacing')) {
    if (sizeKey) throw new BadRequest('use either size or spacing, not both');
    o.unit = q.has('unit') ? pick(q.get('unit'), ['mm', 'in'], 'unit') : 'mm';
    const lim = LIMITS[o.unit];
    o.spacing = num(q.get('spacing'), 'spacing (' + o.unit + ')', lim[0], lim[1]);
    o.majorEvery = 0;
  } else if (q.has('unit')) {
    throw new BadRequest('unit only applies together with spacing');
  }

  if (q.has('paper')) o.paper = pick(q.get('paper'), Object.keys(GridEngine.PAPER), 'paper');
  if (q.has('orientation')) o.orientation = pick(q.get('orientation'), ['portrait', 'landscape'], 'orientation');
  if (q.has('major')) o.majorEvery = Math.round(num(q.get('major'), 'major', 0, 20));
  if (q.has('pages')) o.pages = Math.round(num(q.get('pages'), 'pages', 1, MAX_PAGES));
  if (q.has('calibration')) o.calibration = bool(q.get('calibration'), 'calibration');

  const bg = BACKGROUNDS[q.has('background') ? pick(q.get('background'), Object.keys(BACKGROUNDS), 'background') : 'white'];
  o.bg = bg.bg;
  o.calibInk = bg.calibInk;
  if (bg.color) o.color = bg.color;

  if (q.has('color')) {
    const c = q.get('color').toLowerCase();
    if (COLORS[c]) o.color = COLORS[c];
    else if (/^#?[0-9a-f]{6}$/.test(c)) o.color = '#' + c.replace('#', '');
    else throw new BadRequest('color must be ' + Object.keys(COLORS).join(', ') + ' or a hex value like 4A7FB5');
  }
  return o;
}

function json(status, body) {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export function handlePdf(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(405, { error: 'Use GET', docs: 'https://printgridpaper.com/llms.txt' });
  }
  let o, bytes;
  try {
    o = parseOptions(new URL(request.url).searchParams);
    bytes = GridEngine.buildPDF(o);
  } catch (err) {
    return json(400, { error: err.message, docs: 'https://printgridpaper.com/llms.txt' });
  }
  const g = GridEngine.computeGrid(o);
  return new Response(request.method === 'HEAD' ? null : bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.length),
      'Content-Disposition': 'inline; filename="' + GridEngine.filename(o) + '"',
      'Cache-Control': 'public, max-age=86400',
      // Fetchable by anyone, but every parameter combination is a separate
      // URL: keep them out of search results.
      'X-Robots-Tag': 'noindex',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Grid-Columns, X-Grid-Rows, X-Square-Size-Mm',
      'X-Grid-Columns': String(g.cols),
      'X-Grid-Rows': String(g.rows),
      'X-Square-Size-Mm': String(Math.round(g.step * 1000) / 1000)
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/pdf') return env.ASSETS.fetch(request);

    // Same query, same bytes: serve repeats from the edge cache.
    const cache = request.method === 'GET' && typeof caches !== 'undefined' ? caches.default : null;
    const hit = cache ? await cache.match(request) : null;
    if (hit) return hit;
    const res = handlePdf(request);
    if (cache && res.status === 200) ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  }
};
