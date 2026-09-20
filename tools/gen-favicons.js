/* ============================================================================
   tools/gen-favicons.js — rasterize the brand grid mark into real favicon
   files at the root of the site.

   Why this exists: every page used to declare its icon as an inline
   `data:image/svg+xml,...` URI. Browsers honour that, but Google's favicon
   fetcher only takes an icon it can request over HTTP, so the site showed the
   default globe in Search / Search Console. Google also ignores icons smaller
   than 48x48, and wants a square whose edge is a multiple of 48.

   The mark is the same geometry as the <svg class="brand"> in the site header
   (16x16 viewBox, white field, #C3CDD2 frame, #4A7FB5 rules at 4.5/8.5/12.5),
   scaled up so the proportions stay identical at every size.

   Pure Node — no dependencies, no build step, deterministic output.

       node tools/gen-favicons.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var ROOT = path.join(__dirname, '..');

var FRAME = [0xc3, 0xcd, 0xd2]; // #C3CDD2 — same as the header mark's stroke
var RULE = [0x4a, 0x7f, 0xb5]; // #4A7FB5 — same as the header mark's grid
var UNITS = 16; // the mark's viewBox is 0 0 16 16
var RULES_AT = [4.5, 8.5, 12.5]; // grid line centres, in viewBox units

/* -- the mark, rasterized square at `size` px ------------------------------ */
function renderMark(size) {
  var scale = size / UNITS;
  var px = Buffer.alloc(size * size * 3, 0xff); // start as a white field

  function plot(x, y, rgb) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    var i = (y * size + x) * 3;
    px[i] = rgb[0];
    px[i + 1] = rgb[1];
    px[i + 2] = rgb[2];
  }

  // Frame first, then the rules on top — the same paint order as the SVG,
  // where the <g> of rules is drawn after the <rect>.
  var frame = Math.max(1, Math.round(scale / 2));
  for (var f = 0; f < frame; f++) {
    for (var n = 0; n < size; n++) {
      plot(n, f, FRAME);
      plot(n, size - 1 - f, FRAME);
      plot(f, n, FRAME);
      plot(size - 1 - f, n, FRAME);
    }
  }

  var weight = Math.max(1, Math.round(scale)); // stroke-width 1, in units
  RULES_AT.forEach(function (unit) {
    var start = Math.round(unit * scale - weight / 2);
    for (var w = 0; w < weight; w++) {
      var at = start + w;
      for (var n2 = 0; n2 < size; n2++) {
        plot(at, n2, RULE); // vertical rule
        plot(n2, at, RULE); // horizontal rule
      }
    }
  });

  return px;
}

/* -- minimal PNG writer (8-bit truecolour, no interlace) ------------------- */
var CRC_TABLE = (function () {
  var table = new Int32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  var c = -1;
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  var body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function toPng(px, size) {
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (None).
  var stride = size * 3;
  var raw = Buffer.alloc((stride + 1) * size);
  for (var y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* -- ICO container, holding PNG-compressed entries -------------------------- */
function toIco(pngs) {
  var header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  var offset = 6 + pngs.length * 16;
  var entries = pngs.map(function (entry) {
    var dir = Buffer.alloc(16);
    dir[0] = entry.size >= 256 ? 0 : entry.size; // 0 stands for 256
    dir[1] = entry.size >= 256 ? 0 : entry.size;
    dir[2] = 0; // palette size
    dir[3] = 0; // reserved
    dir.writeUInt16LE(1, 4); // colour planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(entry.data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += entry.data.length;
    return dir;
  });

  return Buffer.concat(
    [header].concat(entries).concat(
      pngs.map(function (entry) {
        return entry.data;
      })
    )
  );
}

/* -- outputs ---------------------------------------------------------------- */
// 48 / 96 / 192 are what Google asks for: square, edge a multiple of 48.
// 180 is the size Apple uses for the home-screen icon.
var PNG_TARGETS = [
  { size: 48, file: 'favicon-48.png' },
  { size: 96, file: 'favicon-96.png' },
  { size: 192, file: 'favicon-192.png' },
  { size: 180, file: 'apple-touch-icon.png' }
];
var ICO_SIZES = [16, 32, 48]; // what browser chrome and legacy clients ask for

function main() {
  PNG_TARGETS.forEach(function (target) {
    var png = toPng(renderMark(target.size), target.size);
    fs.writeFileSync(path.join(ROOT, target.file), png);
    console.log('wrote ' + target.file + ' (' + target.size + 'x' + target.size + ', ' + png.length + ' bytes)');
  });

  var ico = toIco(
    ICO_SIZES.map(function (size) {
      return { size: size, data: toPng(renderMark(size), size) };
    })
  );
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico);
  console.log('wrote favicon.ico (' + ICO_SIZES.join('/') + ', ' + ico.length + ' bytes)');
}

main();
