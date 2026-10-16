// Exporte une leçon HTML en PDF A4 et signale les pages dont le contenu déborde sur le pied de page.
// Usage : node contenus/render-pdf.js contenus/<leçon>.html contenus/<leçon>.pdf
const { chromium } = require('playwright');
const [,, src, pdf, shots] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto('file://' + require('path').resolve(src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + f.weight));
  console.log('fonts loaded:', fonts.length);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
    const c = pg.querySelector('.content'); const foot = pg.querySelector('.foot');
    const r = c.getBoundingClientRect(); const f = foot.getBoundingClientRect();
    return `p${i+1}: content bottom ${Math.round(r.bottom - pg.getBoundingClientRect().top)}px, foot top ${Math.round(f.top - pg.getBoundingClientRect().top)}px ${r.bottom > f.top - 4 ? 'OVERFLOW' : ''}`;
  }));
  console.log(over.join('\n'));
  await p.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (shots) {
    await p.emulateMedia({ media: 'print' });
    const pages = await p.$$('.page');
    for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${shots}/page-${String(i+1).padStart(2,'0')}.png` });
  }
  await b.close();
})();
