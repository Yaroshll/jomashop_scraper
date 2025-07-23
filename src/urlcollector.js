// urlcollector.js
import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js"; 

export async function collectProductUrls(categoryUrl, minDiscount = 40, extraTags = []) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // Mobile viewport
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const domain = "https://www.jomashop.com";
  const allUrls = new Set();
  let loadMoreAttempts = 0;
  const maxLoadMoreAttempts = 100;

  try {
    console.log(`🌐 Navigating to: ${categoryUrl}`);
    try {
      await page.goto(categoryUrl, {
        waitUntil: "domcontentloaded",
        timeout: 3000,
      });
    } catch {
      console.log("⚠️ Initial load timed out, retrying with longer timeout");
      await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
    }

    await waitForProductList(page);

    while (loadMoreAttempts < maxLoadMoreAttempts) {
      const previousCount = allUrls.size;
      const newUrls = await extractProductUrls(page, domain, minDiscount);
      newUrls.forEach((url) => allUrls.add(url));
      console.log(`📊 Total products: ${allUrls.size}`);

      await handleAllPopups(page);

      const loadedMore = await attemptLoadMore(page);
      if (!loadedMore) {
        console.log('⏹️ No more "Load More" button found');
        break;
      }

      try {
        await waitForNewProducts(page, previousCount);
        loadMoreAttempts = 0;
      } catch {
        loadMoreAttempts++;
        console.warn(
          `⚠️ Failed to load new products (attempt ${loadMoreAttempts}/${maxLoadMoreAttempts})`
        );
        await page.waitForTimeout(2000);
      }
    }

    const urlArray = Array.from(allUrls);
    const output = formatOutput(urlArray, categoryUrl, minDiscount, extraTags);
    const filename = saveResults(output);

    console.log(`✅ Saved ${urlArray.length} product URLs to ${filename}`);
    return output;

  } catch (error) {
    console.error("❌ Error during scraping:", error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

// helper functions ...

function formatOutput(urlArray, categoryUrl, minDiscount, extraTags) {
  const chunked = {};
  for (let i = 0; i < urlArray.length; i += 10) {
    chunked[`array${Math.floor(i / 10) + 1}`] = urlArray.slice(i, i + 10);
  }

  const brandType = new URL(categoryUrl).pathname
    .replace(/\//g, "")
    .replace(/-/g, " ");

  return {
    extraTags, // ← NEW
    urls: chunked,
    summary: {
      totalProducts: urlArray.length,
      brandType,
      minDiscount,
      collectedAt: new Date().toISOString(),
    },
  };
}
