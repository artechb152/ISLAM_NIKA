import { getPage, shot, hold, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
for (let i=0;i<4;i++){
  await hold(page, ['s'], 900);
  const p = await pos2(page);
  console.log(i, JSON.stringify(p));
  if (p && p.atTask) break;
}
await shot(page, '105-approach-map');
console.log('TXT:', JSON.stringify(await text(page, 600)));
await browser.close();
