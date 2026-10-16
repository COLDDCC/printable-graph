// Static cards and previews share the same presets as their PDF downloads.
const fs=require('node:fs');
const engine=require('../assets/grid-engine');
const templates=[
 ['5mm','5 mm graph paper','School & maths','Metric squares for homework, plotting and sketching.','5mm-graph-paper',{spacing:5,unit:'mm',majorEvery:5,paper:'a4'}],
 ['quarter-inch','1/4 inch graph paper','School & maths','Quad ruled paper for US classroom assignments.','quarter-inch-graph-paper',{spacing:.25,unit:'in',majorEvery:4,paper:'letter'}],
 ['1cm','1 cm graph paper','School & maths','Larger squares for clear diagrams and early maths.','1cm-graph-paper',{spacing:10,unit:'mm',majorEvery:5,paper:'a4'}],
 ['half-inch','1/2 inch graph paper','School & maths','Roomy squares for young learners and rough sketches.','half-inch-graph-paper',{spacing:.5,unit:'in',majorEvery:2,paper:'letter'}],
 ['engineering','10 squares per inch','Design & craft','Fine squares for calculation tables and detailed charts.','10-squares-per-inch-graph-paper',{spacing:.1,unit:'in',majorEvery:10,paper:'letter'}],
 ['pixel','1/8 inch graph paper','Design & craft','A compact grid for pixel art and stitch patterns.','eighth-inch-graph-paper',{spacing:.125,unit:'in',majorEvery:8,paper:'letter'}],
 ['dot','Dot grid paper','Design & craft','A quiet dotted guide for journals and freehand layouts.','dot-grid-paper',{style:'dot',spacing:5,unit:'mm',majorEvery:0,paper:'a4'}],
 ['coordinate','Coordinate graph paper','Specialty grids','Centred axes with numbered coordinates for plotting.','coordinate-graph-paper',{style:'coordinate',spacing:5,unit:'mm',majorEvery:5,paper:'a4'}],
 ['isometric','Isometric graph paper','Specialty grids','A 30-degree guide for three-dimensional sketches.','isometric-graph-paper',{style:'isometric',spacing:5,unit:'mm',majorEvery:0,paper:'a4'}],
 ['hexagonal','Hexagonal graph paper','Specialty grids','A hex grid for maps, games and geometric patterns.','hexagonal-graph-paper',{style:'hexagonal',spacing:5,unit:'mm',majorEvery:0,paper:'a4'}],
 ['polar','Polar graph paper','Specialty grids','Concentric rings and 24 radial lines for angular plots.','polar-graph-paper',{style:'polar',spacing:5,unit:'mm',radials:24,paper:'a4'}],
 ['tabloid','11 × 17 graph paper','Large format','Quarter-inch squares on Tabloid paper; use a compatible printer.','tabloid-graph-paper',{spacing:.25,unit:'in',majorEvery:4,paper:'tabloid'}]
];
fs.mkdirSync('assets/templates',{recursive:true});
const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const cards=templates.map(([id,title,group,description,slug,options])=>{
 const cfg={style:'square',majorEvery:5,color:'#4A7FB5',calibration:true,margin:10,...options};
 fs.writeFileSync(`assets/templates/${id}.svg`,engine.renderSVG(cfg));
 const fragment=encodeURIComponent(JSON.stringify(cfg));
 const query=new URLSearchParams({spacing:cfg.spacing,unit:cfg.unit,paper:cfg.paper,style:cfg.style,major:cfg.majorEvery});
 return `<article class="template-card" data-category="${group}">
 <a class="template-preview" href="/#${fragment}" aria-label="Customize ${title}"><img src="/assets/templates/${id}.svg" width="210" height="297" loading="lazy" alt="${title}: ${cfg.paper.toUpperCase()} printable sheet"></a>
 <div class="template-copy"><span class="template-category">${group} · ${cfg.paper.toUpperCase()}</span><h3><a href="/${slug}/">${title}</a></h3><p>${description}</p>
 <div class="template-actions"><a href="/api/pdf?${escape(query.toString())}" data-template-pdf='${JSON.stringify(cfg)}'>Download PDF</a><a href="/#${fragment}">Customize</a></div></div></article>`;
}).join('\n');
const section=`<!-- template-library:start -->
<section class="template-library" id="paper-templates" aria-labelledby="template-title">
 <div class="sec-hd"><h2 id="template-title">Choose a printable paper template</h2><p class="sec-lede">Start with a ready-made sheet. Download its PDF now, or customize the grid, colour and paper size.</p></div>
 <div class="template-filters" role="group" aria-label="Filter paper templates" hidden>${['All templates','School & maths','Design & craft','Specialty grids','Large format'].map((x,i)=>`<button type="button" data-template-filter="${x}" aria-pressed="${i===0}">${x}</button>`).join('')}</div>
 <p class="template-count" role="status" aria-live="polite" hidden></p>
 <div class="template-grid">${cards}</div>
 <p class="quick-note">Need ruled writing sheets? Explore <a href="/lined-paper/">lined paper</a>, <a href="/cornell-notes/">Cornell notes</a> and <a href="/handwriting-paper/">handwriting paper</a>. Print all templates at 100% / Actual size.</p>
</section>
<!-- template-library:end -->`;
for (const file of ['index.html','graph-paper-templates/index.html']) {
 let html=fs.readFileSync(file,'utf8');
 if(html.includes('<!-- template-library:start -->')) html=html.replace(/<!-- template-library:start -->[\s\S]*?<!-- template-library:end -->/,section);
 else if(file==='index.html') {
  html=html.replace(/  <section id="presets-card">[\s\S]*?<\/section>\n/,'');
  html=html.replace('<section class="writing-directory">',section+'\n<section class="writing-directory">');
 } else html=html.replace('  <section id="templates">',section+'\n  <section id="templates">');
 if(!html.includes('src="/assets/template-library.js"')) html=html.replace('</body>',(file==='index.html'?'':'<script src="/assets/grid-engine.js"></script>\n')+'<script src="/assets/template-library.js"></script>\n</body>');
 fs.writeFileSync(file,html);
}
console.log(`Generated ${templates.length} presets, SVG previews and both template libraries.`);
