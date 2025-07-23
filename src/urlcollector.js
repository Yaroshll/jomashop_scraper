import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js";

export async function collectProductUrls(inputObject, minDiscount = 40) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const domain = "https://www.jomashop.com";
  let results = {
    arrays: {},  // This will store all arrays with their details
    summary: {
      totalProducts: 0,
      totalArrays: 0,
      collectedAt: new Date().toISOString(),
      minDiscount: minDiscount
    }
  };

  try {
    // Process each URL in the input object
    for (const [key, value] of Object.entries(inputObject)) {
      if (key.startsWith("url")) {
        const arrayNumber = key.substring(3);
        const categoryUrl = value;
        const extraTags = inputObject[`extraTags${arrayNumber}`] || [];
        
        console.log(`🚀 Processing URL: ${categoryUrl}`);
        let currentUrl = categoryUrl;
        let pageNumber = 1;
        let visited = new Set();
        let urlArray = [];

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
          urlArray.push(...newUrls);

          await handleAllPopups(page);

          // Get next page link
          const nextUrl = await page.evaluate((domain) => {
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
            break;
          }
        }

        // Remove duplicates
        const uniqueUrls = Array.from(new Set(urlArray));
        
        // Add to results with detailed info
        const arrayKey = `array${arrayNumber}`;
        results.arrays[arrayKey] = {
          urls: uniqueUrls,
          extraTags: extraTags,
          summary: {
            productCount: uniqueUrls.length,
            sourceUrl: categoryUrl,
            tags: extraTags,
            scrapedAt: new Date().toISOString()
          }
        };

        // Update global summary
        results.summary.totalProducts += uniqueUrls.length;
        results.summary.totalArrays++;
        
        console.log(`✅ Collected ${uniqueUrls.length} products for ${arrayKey}`);
      }
    }

    // Save results
    const filename = saveResults(results);
    console.log(`💾 Saved results to ${filename}`);

    return results;
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
          // Check for tester label first
          const testerLabel = product.querySelector(
            'span.tag-item.tester-label svg[viewBox="0 0 24 24"]'
          );
          if (testerLabel) return null; // Skip tester products

          const discountEl = product.querySelector(
            ".tag-item.discount-label, .ProductCard__discount"
          );
          if (!discountEl && minDiscount) return null;

          const discountMatch = discountEl?.textContent.trim().match(/(\d+)%/);
          if (
            minDiscount &&
            (!discountMatch || parseInt(discountMatch[1]) < minDiscount)
          )
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

function saveResults(output) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = "URL_scraper_output";
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = path.join(outputDir, `jomashop_urls_${timestamp}.json`);
    const dataToSave = JSON.stringify(output, null, 2);
    
    fs.writeFileSync(filename, dataToSave);
    console.log(`✅ Successfully saved results to ${filename}`);
    return filename;
  } catch (error) {
    console.error("❌ Error saving results:", error);
    throw error;
  }
}
