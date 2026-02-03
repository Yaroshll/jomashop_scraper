import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { handleAllPopups } from "./helpers/popupHandler.js";

export async function collectProductUrls(categoryUrl, minDiscount = 40) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const domain = "https://www.jomashop.com";
  let allProducts = [];
  let visited = new Set();
  let currentUrl = categoryUrl;
  let pageNumber = 1;
  
  // Create filename for this session
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFilename = path.join(
    "URL_scraper_output",
    `jomashop_products_${timestamp}.json`
  );
  
  // Create backup filename
  const backupFilename = path.join(
    "URL_scraper_output",
    `jomashop_products_backup_${timestamp}.json`
  );
  
  // Ensure output directory exists
  if (!fs.existsSync("URL_scraper_output")) {
    fs.mkdirSync("URL_scraper_output", { recursive: true });
  }
  
  // Initialize session file
  const sessionData = {
    products: {},
    summary: {
      totalProducts: 0,
      brandType: new URL(categoryUrl).pathname
        .replace(/\//g, "")
        .replace(/-/g, " "),
      minDiscount,
      collectedAt: new Date().toISOString(),
      status: "in_progress",
      lastPage: 0,
      lastUrl: ""
    }
  };
  
  fs.writeFileSync(sessionFilename, JSON.stringify(sessionData, null, 2));

  try {
    while (currentUrl && !visited.has(currentUrl)) {
      visited.add(currentUrl);

      console.log(`➡️ Scraping page ${pageNumber}`);
      await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await waitForProductList(page);

      const newProducts = await extractProductData(page, domain, minDiscount);
      console.log(`  + Found ${newProducts.length} products on this page`);
      allProducts.push(...newProducts);

      // Save progress after each page
      await saveProgress(allProducts, sessionFilename, backupFilename, pageNumber, currentUrl);

      await handleAllPopups(page);

      // Get next page link dynamically from pagination
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
        break; // No more pages
      }
    }

    // Remove duplicates by URL
    const uniqueProducts = Array.from(
      new Map(allProducts.map(item => [item.url, item])).values()
    );
    
    // Final save with completed status
    const output = formatOutput({
      productsArray: uniqueProducts,
      categoryUrl,
      minDiscount,
      arraySize: 300,
    });
    
    // Update session file with completed status
    output.summary.status = "completed";
    output.summary.lastPage = pageNumber;
    output.summary.finalUrl = currentUrl;
    
    // Save final results
    fs.writeFileSync(sessionFilename, JSON.stringify(output, null, 2));
    
    // Also save with timestamped final name
    const finalFilename = path.join(
      "URL_scraper_output",
      `jomashop_products_final_${timestamp}.json`
    );
    fs.writeFileSync(finalFilename, JSON.stringify(output, null, 2));
    
    console.log(`✅ Saved ${uniqueProducts.length} product URLs to ${sessionFilename}`);
    console.log(`📁 Backup saved to: ${backupFilename}`);
    console.log(`🎯 Final results saved to: ${finalFilename}`);

    return output;
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    
    // Save progress with error status
    try {
      const errorData = {
        products: formatOutput({
          productsArray: allProducts,
          categoryUrl,
          minDiscount,
          arraySize: 300,
        }).products,
        summary: {
          totalProducts: allProducts.length,
          brandType: new URL(categoryUrl).pathname
            .replace(/\//g, "")
            .replace(/-/g, " "),
          minDiscount,
          collectedAt: new Date().toISOString(),
          status: "error",
          lastPage: pageNumber,
          lastUrl: currentUrl,
          error: error.message,
          errorStack: error.stack
        }
      };
      
      fs.writeFileSync(sessionFilename, JSON.stringify(errorData, null, 2));
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

async function saveProgress(allProducts, sessionFilename, backupFilename, pageNumber, currentUrl) {
  try {
    const progressData = {
      products: formatOutput({
        productsArray: allProducts,
        categoryUrl: "", // Not needed for progress
        minDiscount: 0,
        arraySize: 300,
      }).products,
      summary: {
        totalProducts: allProducts.length,
        brandType: "in_progress",
        minDiscount: 0,
        collectedAt: new Date().toISOString(),
        status: "in_progress",
        lastPage: pageNumber,
        lastUrl: currentUrl
      }
    };
    
    // Save to main session file
    fs.writeFileSync(sessionFilename, JSON.stringify(progressData, null, 2));
    
    // Create backup
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
          
          // Check if product is out of stock
          const isOutOfStock = product.querySelector(
            ".product-badges .product-badges__oos--plp span"
          )?.textContent.trim() === "OUT OF STOCK";

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

function formatOutput({ productsArray, categoryUrl, minDiscount, arraySize = 10 }) {
  const chunked = {};
  for (let i = 0; i < productsArray.length; i += arraySize) {
    chunked[`array${Math.floor(i / arraySize) + 1}`] = productsArray.slice(
      i,
      i + arraySize
    );
  }

  const brandType = new URL(categoryUrl).pathname
    .replace(/\//g, "")
    .replace(/-/g, " ");

  return {
    products: chunked,
    summary: {
      totalProducts: productsArray.length,
      brandType,
      minDiscount,
      collectedAt: new Date().toISOString(),
    },
  };
}
