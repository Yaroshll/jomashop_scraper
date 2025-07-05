import { chromium } from "playwright";

/**
 * Launches a browser instance
 * @returns {Promise<import('playwright').Browser>}
 */
export async function launchBrowser() {
  return await chromium.launch({
    headless: false,
  });
}
