const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 628, deviceScaleFactor: 2 });
    
    const fileUrl = `file://${path.resolve(__dirname, 'banner_v2.html')}`;
    await page.goto(fileUrl);
    
    // Ensure fonts are loaded if any, wait a bit for effects
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.screenshot({ path: path.resolve(__dirname, 'storio_banner_v2.png') });
    console.log('Banner generated successfully at temp_banner/storio_banner_v2.png');
    
    await browser.close();
  } catch (error) {
    console.error('Puppeteer failed:', error.message);
  }
})();
