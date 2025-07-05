import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js"; // Updated import name

export async function collectProductUrls(categoryUrl, minDiscount = 40) {
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

    // First try with reduced timeout
    try {
      await page.goto(categoryUrl, {
        waitUntil: "domcontentloaded",
        timeout: 3000,
      });
    } catch (error) {
      console.log("⚠️ Initial load timed out, retrying with longer timeout");
      await page.goto(categoryUrl, {
        waitUntil: "domcontentloaded",
        timeout: 12000,
      });
    }

    // Wait for product list with multiple selectors
    await waitForProductList(page);

    while (loadMoreAttempts < maxLoadMoreAttempts) {
      const previousCount = allUrls.size;

      // Extract product URLs
      const newUrls = await extractProductUrls(page, domain, minDiscount);
      newUrls.forEach((url) => allUrls.add(url));

      console.log(`📊 Total products: ${allUrls.size}`);
      // Handle popup again befor loading more
      await handleAllPopups(page);
      // Try to load more
      const loadedMore = await attemptLoadMore(page);
      if (!loadedMore) {
        console.log('⏹️ No more "Load More" button found');
        break;
      }

      // Wait for new products with timeout
      try {
        await waitForNewProducts(page, previousCount);
        loadMoreAttempts = 0;
      } catch (error) {
        loadMoreAttempts++;
        console.warn(
          `⚠️ Failed to load new products (attempt ${loadMoreAttempts}/${maxLoadMoreAttempts})`
        );
        await page.waitForTimeout(2000);
      }
    }

    // Prepare output
    const urlArray = Array.from(allUrls);
    const output = formatOutput(urlArray, categoryUrl, minDiscount);

    // Save results
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

// Helper Functions

async function waitForProductList(page) {
  try {
    await page.waitForSelector(
      "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard",
      {
        timeout: 3000,
      }
    );
  } catch (error) {
    console.error("Timed out waiting for product list to load");
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

    const buttonSelectors = [
      "button.LoadContent__button:not([disabled])",
      "a.btn.primary.btn-link-as-btn",
      'button[data-testid="load-more-button"]',
    ];

    for (const selector of buttonSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForTimeout(1500); // Wait for click to register
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log("Load More click failed:", error.message);
    return false;
  }
}

async function waitForNewProducts(page, previousCount) {
  await page.waitForFunction(
    (prevCount) => {
      const currentCount = document.querySelectorAll(
        "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
      ).length;
      return currentCount > prevCount;
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
  const filename = path.join(
    "products_details_output",
    `jomashop_urls_${timestamp}.json`
  );

  fs.mkdirSync("products_details_output", { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));

  return filename;
}
