import { launchBrowser } from './helpers/browser.js';
import { scrapeProduct } from './helpers/scraper.js';
import { generateExcelRows, exportToExcel } from './helpers/excel.js';

// Input URLs
const productUrls = [
  'https://www.jomashop.com/seiko-seiko-5-watch-snk063j5.html',
  // Add more URLs here
];

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  
  const allRows = [];
  
  for (const url of productUrls) {
    try {
      console.log(`Scraping ${url}`);
      const productData = await scrapeProduct(page, url);
      const rows = generateExcelRows(productData);
      allRows.push(...rows);
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  await browser.close();

  // Generate filename with current date
  const now = new Date();
  const dateString = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const filename = `outputs/jomashop_watch_${dateString}.xlsx`;

  exportToExcel(allRows, filename);
  console.log(`Data exported to ${filename}`);
}

main().catch(console.error);