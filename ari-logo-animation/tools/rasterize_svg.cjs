// Rasterize build/svg/*.svg to build/layers/*.png (transparent) at a fixed
// scale using the pre-installed Chromium via Playwright.
// usage: node tools/rasterize_svg.js <scale>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scale = parseFloat(process.argv[2] || '2');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dir = path.join(root, 'build/svg');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    const w = parseFloat(svg.match(/width="([\d.]+)"/)[1]);
    const h = parseFloat(svg.match(/height="([\d.]+)"/)[1]);
    const W = Math.round(w * scale), H = Math.round(h * scale);
    await page.setViewportSize({ width: W, height: H });
    const sized = svg.replace(/width="[\d.]+"/, `width="${W}"`).replace(/height="[\d.]+"/, `height="${H}"`);
    await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
    const out = path.join(root, 'build/layers', f.replace('.svg', '.png'));
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    console.log('wrote', out, W, H);
  }
  await browser.close();
})();
