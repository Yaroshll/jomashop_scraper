import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js";

export async function collectProductUrls(categoryUrl, minDiscount = 0, extraTags = []) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
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
    } catch (error) {
      console.log("⚠️ Initial load timed out, retrying...");
      await page.goto(categoryUrl, {
        waitUntil: "domcontentloaded",
        timeout: 12000,
      });
    }

    await waitForProductList(page);

    while (loadMoreAttempts < maxLoadMoreAttempts) {
      const previousCount = allUrls.size;

      const newUrls = await extractProductUrls(page, domain, minDiscount);
      newUrls.forEach((url) => allUrls.add(url));

      console.log(`📦 Total URLs so far: ${allUrls.size}`);

      await handleAllPopups(page);

      const loadedMore = await attemptLoadMore(page);
      if (!loadedMore) {
        console.log("⏹️ No more Load More button");
        break;
      }

      try {
        await waitForNewProducts(page, previousCount);
        loadMoreAttempts = 0;
      } catch {
        loadMoreAttempts++;
        console.warn(
          `⚠️ Failed to detect new products (attempt ${loadMoreAttempts}/${maxLoadMoreAttempts})`
        );
        await page.waitForTimeout(2000);
      }
    }

    const urlArray = Array.from(allUrls);
    const output = formatOutput(urlArray, categoryUrl, minDiscount);
    output.extraTags = extraTags;

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

// 🧩 Helpers

async function waitForProductList(page) {
  try {
    await page.waitForSelector(
      "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard",
      { timeout: 3000 }
    );
  } catch (error) {
    console.error("⏱️ Timed out waiting for product list");
    throw error;
  }
}

async function extractProductUrls(page, domain, minDiscount) {
  return await page.evaluate(
    ({ domain, minDiscount }) => {
      const products = Array.from(
        document.querySelectorAll(
          "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
        )
      );

      return products
        .map((product) => {
          const discountEl = product.querySelector(
            ".tag-item.discount-label, .ProductCard__discount"
          );
          if (!discountEl) return null;

          const discountMatch = discountEl.textContent.trim().match(/(\d+)%/);
          if (!discountMatch || parseInt(discountMatch[1]) < minDiscount)
            return null;

          const link = product.querySelector(
            "a.productName-link, a.ProductCard__link"
          );
          return link ? `${domain}${link.getAttribute("href")}` : null;
        })
        .filter((url) => url !== null);
    },
    { domain, minDiscount }
  );
}

async function attemptLoadMore(page) {
  try {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const selectors = [
      "button.LoadContent__button:not([disabled])",
      "a.btn.primary.btn-link-as-btn",
      'button[data-testid="load-more-button"]',
    ];

    for (const selector of selectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForTimeout(1500);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Load More button failed:", error.message);
    return false;
  }
}

async function waitForNewProducts(page, previousCount) {
  await page.waitForFunction(
    (prev) => {
      const count = document.querySelectorAll(
        "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
      ).length;
      return count > prev;
    },
    { timeout: 15000 },
    previousCount
  );
}

function formatOutput(urlArray, categoryUrl, minDiscount) {
  const chunked = {};
  for (let i = 0; i < urlArray.length; i += 10) {
    chunked[`array${Math.floor(i / 10) + 1}`] = urlArray.slice(i, i + 10);
  }

  const brandType = new URL(categoryUrl).pathname
    .replace(/\//g, "")
    .replace(/-/g, " ");

  return {
    urls: chunked,
    summary: {
      totalProducts: urlArray.length,
      brandType,
      minDiscount,
      collectedAt: new Date().toISOString(),
    },
  };
}

function saveResults(output) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = "products_details_output";
  const filename = path.join(dir, `jomashop_urls_${timestamp}.json`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  return filename;
}
