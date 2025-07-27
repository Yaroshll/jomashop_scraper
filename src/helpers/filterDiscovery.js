import { launchBrowser } from "./browser.js";
import { handleAllPopups } from "./popupHandler.js";
import fs from "fs/promises";
import path from "path";

export async function discoverFilterUrls(baseUrl, baseTags = []) {
  // Create debug directory if it doesn't exist
  await fs.mkdir("debug", { recursive: true }).catch(() => {});

  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true
  });
  
  const page = await context.newPage();

  try {
    page.setDefaultTimeout(120000);
    
    console.log(`🌐 Navigating to ${baseUrl}`);
    const response = await page.goto(baseUrl, { 
      waitUntil: "domcontentloaded",
      timeout: 120000 
    });

    if (!response || !response.ok()) {
      throw new Error(`Page failed to load with status: ${response?.status()}`);
    }

    await handleAllPopups(page);

    // Scroll specifically to the filter list wrap
    console.log("🔄 Scrolling to filter section...");
    await scrollToFilterSection(page);

    // Wait for and expand the beauty product type filter
    const beautyFilterSelector = 'li.filter-beauty_product_type';
    await page.waitForSelector(beautyFilterSelector, { timeout: 30000 });
    
    // Check if the filter is collapsed and needs to be expanded
    const isCollapsed = await page.$(`${beautyFilterSelector} div.accordion-collapse.collapse:not(.show)`);
    if (isCollapsed) {
      console.log("🔘 Expanding beauty product filter...");
      await page.click(`${beautyFilterSelector} button.accordion-button`);
      await page.waitForSelector(`${beautyFilterSelector} div.accordion-collapse.show`, { timeout: 10000 });
    }

    // Wait for the sub-categories to load
    const subCategorySelector = `${beautyFilterSelector} ul.item-sub-cat.beauty_product_type li.filter-item a.label-checkbox`;
    await page.waitForSelector(subCategorySelector, { timeout: 30000 });

    // Extract filter items
    const extracted = await page.evaluate((beautyFilterSelector) => {
      const items = [];
      document.querySelectorAll(`${beautyFilterSelector} ul.item-sub-cat.beauty_product_type li.filter-item:not(.filter-item-more)`).forEach(li => {
        const a = li.querySelector("a.label-checkbox");
        if (a) {
          items.push({
            label: a.textContent.trim(),
            href: a.getAttribute("href")
          });
        }
      });
      return items;
    }, beautyFilterSelector);

    if (extracted.length === 0) {
      throw new Error("No beauty product filter items found");
    }

    const domain = new URL(baseUrl).origin;
    const inputObject = {};

    extracted.forEach((item, index) => {
      const num = index + 1;
      inputObject[`url${num}`] = new URL(item.href, domain).href;
      inputObject[`extraTags${num}`] = [...baseTags, item.label];
    });

    console.log(`✅ Discovered ${extracted.length} beauty product filter URLs from ${baseUrl}`);
    return inputObject;

  } catch (error) {
    console.error("❌ Error during filter discovery:", error);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({ path: `debug/filter_error_${timestamp}.png`, fullPage: true });
    console.log("📸 Saved screenshot to debug/filter_error.png");
    
    const html = await page.content();
    await fs.writeFile(`debug/page_source_${timestamp}.html`, html);
    console.log("💾 Saved page HTML source");
    
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

// Helper function to scroll to the specific filter section
async function scrollToFilterSection(page) {
  await page.evaluate(async () => {
    const filterSection = document.querySelector('ul.filter-list-wrap');
    if (filterSection) {
      // Scroll the filter section into view
      filterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait for a moment after scrolling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if the beauty product filter is visible
      const beautyFilter = document.querySelector('li.filter-beauty_product_type');
      if (!beautyFilter) {
        // If still not found, scroll the page more
        window.scrollBy(0, -200); // Scroll up a bit in case of sticky headers
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  });
  await page.waitForTimeout(500); // Additional wait after scrolling
}