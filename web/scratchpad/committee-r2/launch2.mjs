import { chromium } from 'playwright-core';
import fs from 'fs';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--remote-debugging-port=9778']
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const state = JSON.parse(fs.readFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/state.json', 'utf8'));
await ctx.addInitScript((s) => {
  try {
    if (localStorage.getItem('__r2seeded')) return;
    localStorage.setItem('__r2seeded','1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    localStorage.setItem('ch1:arrived:night-camp:v1', '1');
    localStorage.setItem('ch1:muted', '1');
    const nb = JSON.parse(localStorage.getItem('ch1:notebook:v1'));
    nb.region = 'night-camp';
    localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
  } catch (e) {}
}, state);
const page = await ctx.newPage();
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' });
console.log('LAUNCHED, CDP on 9778');
// keep alive
setInterval(() => {}, 60000);
