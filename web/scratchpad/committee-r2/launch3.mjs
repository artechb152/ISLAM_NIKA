import { chromium } from 'playwright-core';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/chrome-profile', {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 1280, height: 720 },
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--remote-debugging-port=9778']
});
const seed = JSON.parse(fs.readFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/seed-mecca.json', 'utf8'));
await ctx.addInitScript((s) => {
  try {
    if (localStorage.getItem('__r2seeded2')) return;
    localStorage.setItem('__r2seeded2', '1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  } catch (e) {}
}, seed);
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil: 'domcontentloaded' });
console.log('LAUNCHED persistent, CDP on 9778');
setInterval(() => {}, 60000);
