await page.click('text=שחיו כאן אנשים שבנו, עיבדו וכתבו');
await page.waitForTimeout(1800);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/30-yemen-answer.png', timeout: 60000 });
return t.slice(0, 1400);
