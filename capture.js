import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const urls = [
  { url: 'https://the-prime-original.vercel.app/', name: 'prime' },
  { url: 'https://prive-chauffeur.vercel.app/', name: 'prive' },
  { url: 'https://brace-pizza.vercel.app/', name: 'brace' },
  { url: 'https://nike-slider.vercel.app/', name: 'nike' },
  { url: 'https://noir-brew-beige.vercel.app/', name: 'noir' },
  { url: 'https://the-doener-mobile.vercel.app/', name: 'doener' },
  { url: 'https://birria-chi.vercel.app/', name: 'birria' },
  { url: 'https://evermore-photography.vercel.app/', name: 'evermore' },
  { url: 'https://lustre-detailing.vercel.app/', name: 'lustre' }
];

const screenshotDir = path.join(__dirname, 'public', 'screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  const browser = await puppeteer.launch({ headless: 'new' });
  
  for (const site of urls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    try {
      console.log(`Navigating to ${site.url}...`);
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait a little bit extra to ensure animations or fonts load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const filePath = path.join(screenshotDir, `${site.name}.jpg`);
      await page.screenshot({ path: filePath, type: 'jpeg', quality: 80 });
      console.log(`Screenshot saved for ${site.name}`);
    } catch (error) {
      console.error(`Failed to capture ${site.name}:`, error.message);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('Finished capturing screenshots.');
}

captureScreenshots();
