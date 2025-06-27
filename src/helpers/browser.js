import { chromium } from 'playwright';

/**
 * Launches a browser instance
 * @returns {Promise<import('playwright').Browser>}
 */
export async function launchBrowser() {
  return await chromium.launch({
    headless: true,
    channel: "chrome",
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-sandbox",
    ],
    timeout: 120000,
  });
}