// Reapply after regenerating pages. Changes only content below the generator.
const fs=require('node:fs');
const configs={
 'dot-grid-paper':{
  title:'Choose dot spacing for your notebook',
  intro:'Dot spacing is the distance from one dot centre to the next. Use a tighter guide for small writing or a wider guide for larger sketches. These links keep the dot pattern selected when you customize.',
  rows:[['5 mm','A4','A compact starting point for journals and everyday notes.',{style:'dot',spacing:5,unit:'mm',paper:'a4',majorEvery:0}],['1/4 inch (6.35 mm)','Letter','More room between dots for larger writing and layouts.',{style:'dot',spacing:.25,unit:'in',paper:'letter',majorEvery:0}],['1 cm','A4','An open guide for large lettering and sketch planning.',{style:'dot',spacing:10,unit:'mm',paper:'a4',majorEvery:0}]],
  faqs:[['Is dot grid paper the same as graph paper?','Dot grid paper marks intersections with dots instead of drawing continuous square borders. It gives you a spacing guide while leaving more of the page visually open. Choose square graph paper when you need to trace cell edges.'],['What does 5 mm dot spacing mean?','Neighbouring dot centres are 5 mm apart horizontally and vertically. It describes spacing, not dot diameter. Print at 100% / Actual size to preserve that distance.'],['Can I make a 1/4 inch dot grid on Letter paper?','Yes. Choose the 1/4 inch preset and Letter paper above, or use the ready-made preset below. A quarter inch is exactly 6.35 mm, so it is wider than a 5 mm grid.'],['Can I make the dots darker or smaller?','Choose a line colour in the generator. Advanced settings includes a custom colour and Line / dot size in millimetres. Download a test sheet before printing a large batch.'],['Can I print dot grid paper double-sided?','The download contains the sheet you configure. Use your printer’s duplex option or print the same page on both sides manually. Match paper sizes and use 100% / Actual size on each side; alignment depends on the printer.']]
 },
 'coordinate-graph-paper':{
  title:'Choose coordinate spacing and graph size',
  intro:'A coordinate unit and a millimetre are different things. The axes label each square as one unit; physical spacing controls how large that unit appears on paper. Label your own scale when one square represents a different quantity.',
  rows:[['5 mm','A4','A compact four-quadrant graph with numbered axes.',{style:'coordinate',spacing:5,unit:'mm',paper:'a4',majorEvery:5}],['1/4 inch (6.35 mm)','Letter','A wider coordinate grid on US Letter paper.',{style:'coordinate',spacing:.25,unit:'in',paper:'letter',majorEvery:4}],['1 cm','A4','Larger squares for clear points and handwritten labels.',{style:'coordinate',spacing:10,unit:'mm',paper:'a4',majorEvery:5}]],
  faqs:[['Does this graph paper include numbered axes?','Yes. Coordinate mode draws horizontal x and vertical y axes with the origin in the centre, positive and negative directions, and numbered ticks. The preview shows the labels included in the PDF.'],['How do I make a 20 by 20 coordinate grid?','Select Coordinate grid, open Advanced settings and choose Exact grid count. Enter 20 columns and 20 rows. This makes 20 squares across and 20 down, with ten unit intervals on each side of the centred origin. Even counts are required for coordinate grids.'],['Can I choose exactly how many squares fit on the page?','Yes. Exact grid count fits your chosen rows and columns inside the printable area while keeping cells square. This calculates physical square size automatically; it does not preserve a separately selected 5 mm or quarter-inch pitch.'],['What is the difference between coordinate paper and numbered cells?','Coordinate paper numbers positions along the x and y axes for plotting points. Number cells puts sequential numbers inside individual cells. Use coordinate mode for graphs and square mode with Number cells for numbered worksheets.'],['How do I keep the printed coordinate grid accurate?','Choose the paper loaded in the printer, print the PDF at 100% / Actual size and check its measuring bars with a ruler. Fit to page changes physical spacing. Changing the scale you assign to an axis is separate from printer scaling.']]
 }
};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for(const [slug,c] of Object.entries(configs)){
 const file=slug+'/index.html';let html=fs.readFileSync(file,'utf8');
 const rows=c.rows.map(([spacing,paper,use,preset])=>{
  const cfg={color:'#4A7FB5',calibration:true,margin:10,...preset};
  return `<tr><th scope="row">${spacing}</th><td>${paper}</td><td>${use}</td><td><a href="/#${encodeURIComponent(JSON.stringify(cfg))}">Use this preset</a></td></tr>`;
 }).join('\n');
 const content=`<section id="sizes"><div class="sec-hd"><h2>${c.title}</h2><p class="sec-lede">${c.intro}</p></div><div class="tscroll specialty-presets"><table class="facts"><caption>Ready-made ${slug==='dot-grid-paper'?'dot':'coordinate'} presets</caption><thead><tr><th scope="col">Spacing</th><th scope="col">Paper</th><th scope="col">Use</th><th scope="col">Customize</th></tr></thead><tbody>${rows}</tbody></table></div><p class="pointer">Prefer continuous square borders? Choose <a href="/5mm-graph-paper/">5 mm graph paper</a> or <a href="/quarter-inch-graph-paper/">quarter-inch quad paper</a>. Browse the <a href="/graph-paper-templates/">visual paper template library</a> for more patterns.</p></section>`;
 html=html.replace(/<section id="sizes">[\s\S]*?<\/section>/,content);
 html=html.replace(/<section id="faq">[\s\S]*?<\/section>/,`<section id="faq"><div class="sec-hd"><h2>${slug==='dot-grid-paper'?'Dot grid':'Coordinate graph'} paper questions</h2></div><div class="faq">${c.faqs.map(([q,a],i)=>`<details${i===0?' open':''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}</div></section>`);
 // Remove a false precision inherited from the ordinary square-grid page.
 html=html.replace(/On a 5&nbsp;mm grid that turns every square into 4\.7&nbsp;mm\./,'For example, scaling a 5 mm spacing to 94% produces 4.7 mm spacing.');
 fs.writeFileSync(file,html);
}
for(const slug of ['graph-paper-for-architecture','graph-paper-for-dnd-maps','graph-paper-for-knitting','graph-paper-for-pixel-art']){
 const file=slug+'/index.html';let html=fs.readFileSync(file,'utf8');
 // These pages already have task-specific how-to questions, not a #faq section.
 html=html.replace('href="#faq">FAQ</a>','href="#howto">How to use</a>');
 fs.writeFileSync(file,html);
}
console.log('Updated dot/coordinate content and repaired four task-page navigation anchors.');
