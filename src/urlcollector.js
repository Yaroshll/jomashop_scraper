import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js";

export async function collectProductUrls(inputObject, minDiscount = 0) {
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
      minDiscount: minDiscount,
      status: "in_progress"  // Add status tracking
    }
  };

  // Create session files for backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFilename = path.join("URL_scraper_output", `jomashop_urls_${timestamp}.json`);
  const backupFilename = path.join("URL_scraper_output", `jomashop_urls_backup_${timestamp}.json`);
  
  // Ensure output directory exists
  if (!fs.existsSync("URL_scraper_output")) {
    fs.mkdirSync("URL_scraper_output", { recursive: true });
  }
  
  // Initialize session file
  fs.writeFileSync(sessionFilename, JSON.stringify(results, null, 2));

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

          const newProducts = await extractProductData(page, domain, minDiscount);
          console.log(`  + Found ${newProducts.length} products on this page`);
          urlArray.push(...newProducts);

          // Save progress after each page
          await saveProgress(results, sessionFilename, backupFilename);

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
        const uniqueProducts = Array.from(new Map(urlArray.map(item => [item.url, item])).values());
        
        // Add to results with detailed info
        const arrayKey = `array${arrayNumber}`;
        results.arrays[arrayKey] = {
          products: uniqueProducts,  // Changed from urls to products
          extraTags: extraTags,
          summary: {
            productCount: uniqueProducts.length,
            sourceUrl: categoryUrl,
            tags: extraTags,
            scrapedAt: new Date().toISOString()
          }
        };
        
        // Update global summary
        results.summary.totalProducts += uniqueProducts.length;
        results.summary.totalArrays++;
        
        // Save progress after each array
        await saveProgress(results, sessionFilename, backupFilename);
        
        console.log(`✅ Collected ${uniqueProducts.length} products for ${arrayKey}`);
      }
    }

    // Save final results
    results.summary.status = "completed";
    fs.writeFileSync(sessionFilename, JSON.stringify(results, null, 2));
    
    // Also save with timestamped final name
    const finalFilename = path.join("URL_scraper_output", `jomashop_urls_final_${timestamp}.json`);
    fs.writeFileSync(finalFilename, JSON.stringify(results, null, 2));
    
    console.log(`💾 Session saved to: ${sessionFilename}`);
    console.log(`💾 Backup saved to: ${backupFilename}`);
    console.log(`🎯 Final results saved to: ${finalFilename}`);

    return results;
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    
    // Save error state with current progress
    results.summary.status = "error";
    results.summary.error = error.message;
    
    try {
      fs.writeFileSync(sessionFilename, JSON.stringify(results, null, 2));
      fs.writeFileSync(backupFilename, JSON.stringify(results, null, 2));
      console.log(`💾 Progress saved to: ${sessionFilename}`);
      console.log(`💾 Backup saved to: ${backupFilename}`);
    } catch (saveError) {
      console.error("❌ Failed to save error data:", saveError);
    }
    
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function saveProgress(results, sessionFilename, backupFilename) {
  try {
    // Create a copy of results for saving
    const progressData = JSON.parse(JSON.stringify(results));
    progressData.summary.status = "in_progress";
    progressData.summary.lastSavedAt = new Date().toISOString();
    
    fs.writeFileSync(sessionFilename, JSON.stringify(progressData, null, 2));
    fs.writeFileSync(backupFilename, JSON.stringify(progressData, null, 2));
  } catch (error) {
    console.error("❌ Failed to save progress:", error);
  }
}

async function waitForProductList(page) {
  try {
    // Scroll to the bottom in 4 steps
    for (let i = 1; i <= 20; i++) {
      await page.evaluate((progress) => {
        window.scrollTo({
          top: document.body.scrollHeight * (progress / 20),
          behavior: "smooth",
        });
      }, i);

      await page.waitForTimeout(500);
    }

    await page.waitForFunction(
      () => {
        const products = document.querySelectorAll(
          "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
        );
        const count = products.length;

        const nextBtn = document.querySelector(
          "ul.pagination li.pagination-next a.page-link[href]"
        );

        if (nextBtn) {
          return count >= 60;
        }

        if (!window._noNextPageTime) {
          window._noNextPageTime = Date.now();
        }
        return Date.now() - window._noNextPageTime > 5000;
      },
      { timeout: 20000 }
    );
  } catch (error) {
    console.error("Timed out waiting for product list to load");
    throw error;
  }
}

async function extractProductData(page, domain, minDiscount) {
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
          if (!link) return null;

          const url = `${domain}${link.getAttribute("href")}`;
          
          // FIXED: Check if product is out of stock
          const outOfStockBadge = product.querySelector(
            ".product-badges .product-badges__oos--plp span"
          );
          
          // Only set to true if badge exists and contains "OUT OF STOCK"
          const isOutOfStock = outOfStockBadge && 
                              outOfStockBadge.textContent.trim() === "OUT OF STOCK";

          return {
            url: url,
            outOfStock: isOutOfStock
          };
        })
        .filter((product) => product !== null);
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
