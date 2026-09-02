// take stock of current screen after the 8 Enter presses (comment-swallow bug means they may not have fired)
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/04-intro-dialogue.png', timeout: 60000 });
return { url: page.url(), text: t.slice(0, 2000) };
