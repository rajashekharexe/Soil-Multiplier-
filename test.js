const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to Vercel...');
  await page.goto('https://kad-soilmultiplier.vercel.app/', { waitUntil: 'networkidle0', timeout: 15000 });

  const canvasExists = await page.$eval('#video-canvas', el => !!el).catch(() => false);
  console.log('Canvas exists:', canvasExists);
  
  if (canvasExists) {
    const canvasData = await page.$eval('#video-canvas', canvas => {
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, 10, 10).data;
        return Array.from(data).join(',');
    });
    console.log('Canvas top-left 10x10 data (should not be all 0s):', canvasData.substring(0, 50) + '...');
  }

  await browser.close();
})();
