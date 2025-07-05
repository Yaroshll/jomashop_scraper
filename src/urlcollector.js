import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js"; // Updated import name

export async function collectProductUrls(categoryUrl, minDiscount = 40) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const domain = "https://www.jomashop.com";
  let allUrls = [];
  let visited = new Set();
  let currentUrl = categoryUrl;
  let pageNumber = 1;

  try {
    while (currentUrl && !visited.has(currentUrl)) {
      visited.add(currentUrl);

      console.log(`➡️ Scraping page ${pageNumber}`);
      await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: 12000,
      });
      await waitForProductList(page);

      const newUrls = await extractProductUrls(page, domain, minDiscount);
      console.log(`  + Found ${newUrls.length} products on this page`);
      allUrls.push(...newUrls);

      await handleAllPopups(page);

      // Get next page link dynamically from pagination
      const nextUrl = await page.evaluate((domain) => {
        // Find pagination "next" button (adjust selector if needed)
        const nextBtn = document.querySelector(
          "ul.pagination li.pagination-next a.page-link[href]"
        );
        if (nextBtn) {
          const href = nextBtn.getAttribute("href");
          return href.startsWith("http") ? href : domain + href;
        }
        return null;
      }, domain);

      if (nextUrl && !visited.has(nextUrl)) {
        currentUrl = nextUrl;
        pageNumber++;
      } else {
        break; // No more pages
      }
    }

    // Remove duplicates
    const urlArray = Array.from(new Set(allUrls));
    const output = formatOutput({
      urlArray,
      categoryUrl,
      minDiscount,
      arraySize: 50,
    });
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

async function waitForProductList(page) {
  try {
    // Scroll to the bottom in 4 steps
    for (let i = 1; i <= 20; i++) {
      await page.evaluate((progress) => {
        // Scroll to a percentage of the page height
        window.scrollTo({
          top: document.body.scrollHeight * (progress / 20),
          behavior: "smooth",
        });
      }, i);

      // Wait a bit after each scroll to allow content to load
      await page.waitForTimeout(500); // Adjust the delay as needed (e.g., 500-1500 ms)
    }

    // After scrolling, wait for products to finish loading (same as before)
    await page.waitForFunction(
      () => {
        const products = document.querySelectorAll(
          "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
        );
        const count = products.length;

        const nextBtn = document.querySelector(
          "ul.pagination li.pagination-next a.page-link[href]"
        );

        // If there is a next page, finish as soon as 60 products are loaded
        if (nextBtn) {
          return count >= 60;
        }

        // If there is NO next page, only finish after 5 seconds (from startTime)
        if (!window._noNextPageTime) {
          window._noNextPageTime = Date.now();
        }
        return Date.now() - window._noNextPageTime > 5000;
      },
      { timeout: 20000 } // adjust as needed
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
function formatOutput({ urlArray, categoryUrl, minDiscount, arraySize = 10 }) {
  const chunked = {};
  for (let i = 0; i < urlArray.length; i += arraySize) {
    chunked[`array${Math.floor(i / arraySize) + 1}`] = urlArray.slice(
      i,
      i + arraySize
    );
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
  if (!fs.existsSync("URL_scraper_output")) {
    fs.mkdirSync("URL_scraper_output", { recursive: true });
  }
  const filename = path.join(
    "URL_scraper_output",
    `jomashop_urls_${timestamp}.json`
  );

  fs.writeFileSync(filename, JSON.stringify(output, null, 2));

  return filename;
}
