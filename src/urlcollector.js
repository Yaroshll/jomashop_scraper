import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js";

export async function collectProductUrls(inputObject, minDiscount = 0) {
  console.log("🔍 Input Object received:", JSON.stringify(inputObject, null, 2));
  
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
    const urlKeys = Object.keys(inputObject).filter(key => key.startsWith("url"));
    console.log(`🔍 Found ${urlKeys.length} URL keys:`, urlKeys);
    
    if (urlKeys.length === 0) {
      console.error("❌ No URL keys found in input object");
      console.error("❌ Available keys:", Object.keys(inputObject));
      throw new Error("No URL keys found in input object");
    }

    for (const key of urlKeys) {
      const arrayNumber = key.substring(3);
      const categoryUrl = inputObject[key];
      const extraTags = inputObject[`extraTags${arrayNumber}`] || [];
      
      console.log(`🚀 Processing URL: ${categoryUrl}`);
      console.log(`🏷️ Array number: ${arrayNumber}`);
      console.log(`🏷️ Extra tags:`, extraTags);
      
      if (!categoryUrl || typeof categoryUrl !== 'string') {
        console.error(`❌ Invalid URL for key ${key}:`, categoryUrl);
        continue;
      }
      
      let currentUrl = categoryUrl;
      let pageNumber = 1;
      let visited = new Set();
      let urlArray = [];
      
      while (currentUrl && !visited.has(currentUrl)) {
        visited.add(currentUrl);
        console.log(`➡️ Scraping page ${pageNumber} - ${currentUrl}`);
        
        try {
          await page.goto(currentUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,  // Increased timeout
          });
          
          // Wait a bit for dynamic content to load
          await page.waitForTimeout(3000);
          
          let productsFound = false;
          
          // Check if we can find any products on the page
          const productCount = await page.evaluate(() => {
            const products = document.querySelectorAll(
              "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
            );
            return products.length;
          });
          
          console.log(`📦 Found ${productCount} product elements on page`);
          
          if (productCount === 0) {
            console.log("⚠️ No products found on this page, trying to navigate to next page");
          } else {
            productsFound = true;
          }
          
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
            console.log(`📄 No more pages found for this category`);
            break;
          }
        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNumber}:`, pageError.message);
          break; // Move to next category if this page fails
        }
      }

      // Remove duplicates
      const uniqueProducts = Array.from(new Map(urlArray.map(item => [item.url, item])).values());
      
      console.log(`✅ Total unique products collected for this category: ${uniqueProducts.length}`);
      
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

    // Save final results
    results.summary.status = "completed";
    results.summary.brandType = "multiple_categories"; // Updated to reflect multiple categories
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
    console.log("⏳ Waiting for product list to load...");
    // Scroll to the bottom in steps
    for (let i = 1; i <= 10; i++) {
      await page.evaluate((progress) => {
        window.scrollTo({
          top: document.body.scrollHeight * (progress / 10),
          behavior: "smooth",
        });
      }, i);

      await page.waitForTimeout(800);
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
          return count >= 20;  // Lowered threshold for next page detection
        }

        if (!window._noNextPageTime) {
          window._noNextPageTime = Date.now();
        }
        return Date.now() - window._noNextPageTime > 3000;  // Reduced wait time
      },
      { timeout: 15000 }
    );
    
    console.log("✅ Product list loaded successfully");
  } catch (error) {
    console.error("⚠️ Timeout waiting for product list to load, continuing anyway");
    // Don't throw error, just continue with what we have
  }
}

async function extractProductData(page, domain, minDiscount) {
  console.log("🔍 Extracting product data...");
  try {
    return await page.evaluate(
      ({ domain, minDiscount }) => {
        console.log("🔍 Inside page.evaluate, looking for products...");
        
        const products = Array.from(
          document.querySelectorAll(
            "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
          )
        );

        console.log(`📦 Found ${products.length} product elements`);

        if (products.length === 0) {
          console.log("⚠️ No product elements found");
          return [];
        }

        return products
          .map((product, index) => {
            try {
              // Check for tester label first
              const testerLabel = product.querySelector(
                'span.tag-item.tester-label svg[viewBox="0 0 24 24"]'
              );
              if (testerLabel) {
                console.log(`⚠️ Skipping tester product ${index}`);
                return null; // Skip tester products
              }

              const discountEl = product.querySelector(
                ".tag-item.discount-label, .ProductCard__discount"
              );
              if (!discountEl && minDiscount > 0) {
                console.log(`⚠️ Skipping product ${index} - no discount and minDiscount > 0`);
                return null;
              }

              const discountMatch = discountEl?.textContent.trim().match(/(\d+)%/);
              if (minDiscount > 0 && (!discountMatch || parseInt(discountMatch[1]) < minDiscount)) {
                console.log(`⚠️ Skipping product ${index} - discount ${discountMatch?.[1] || 0}% < ${minDiscount}%`);
                return null;
              }

              const link = product.querySelector(
                "a.productName-link, a.ProductCard__link"
              );
              if (!link) {
                console.log(`⚠️ No link found for product ${index}`);
                return null;
              }

              const url = `${domain}${link.getAttribute("href")}`;
              
              // Check if product is out of stock
              const outOfStockBadge = product.querySelector(
                ".product-badges .product-badges__oos--plp span"
              );
              
              const isOutOfStock = outOfStockBadge && 
                                  outOfStockBadge.textContent.trim() === "OUT OF STOCK";

              console.log(`✅ Product ${index}: ${url}, outOfStock: ${isOutOfStock}`);
              return {
                url: url,
                outOfStock: isOutOfStock
              };
            } catch (productError) {
              console.error(`❌ Error processing product ${index}:`, productError.message);
              return null;
            }
          })
          .filter((product) => product !== null);
      },
      { domain, minDiscount }
    );
  } catch (evalError) {
    console.error("❌ Error in page.evaluate:", evalError.message);
    return [];
  }
}
