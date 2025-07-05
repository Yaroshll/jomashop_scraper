// helpers/scraper.js
/**
 * @typedef {import('../interfaces.js').ProductData} ProductData - Type definition for product data structure
 */

/**
 * Navigates to a URL with retry logic for handling failures
 * @param {object} page - Puppeteer page object
 * @param {string} url - URL to navigate to
 * @param {number} retries - Number of retry attempts (default: 2)
 */
async function gotoWithRetries(page, url, retries = 2) {
  // Attempt loading the page multiple times if needed
  for (let i = 0; i <= retries; i++) {
    try {
      // Navigate to the URL with a 60-second timeout
      await page.goto(url, { timeout: 60000 });

      // Wait for the brand name element to appear (20-second timeout)
      await page.waitForFunction(
        () => document.querySelector("span.brand-name"),
        { timeout: 20000 }
      );
      return; // Success - exit the function
    } catch (error) {
      // Log retry attempt
      console.warn(
        `Retry ${i + 1}/${retries}: Failed to load ${url} - ${error.message}`
      );

      // If we've exhausted all retries, throw the error
      if (i === retries) throw error;

      // Wait 20 seconds before retrying
      await page.waitForTimeout(20000);
    }
  }
}

/**
 * Scrapes product data from a Jomashop product page
 * @param {object} page - Puppeteer page object
 * @param {string} url - URL of the product page
 * @param {string} genderFallback - Fallback gender if not found in URL
 * @returns {Promise<ProductData>} - Scraped product data
 */
export async function scrapeProduct(page, url, genderFallback = "") {
  // Initialize product data object with default values
  const productData = {
    brandName: "",
    title: "",
    handle: "",
    sku: "",
    originalPrice: "",
    costPerItem: "",
    priceAfterCoupon: "",
    bodyHTML: "",
    imageSrc: [],
    breadcrumbs: [],
    gender: "",
  };

  try {
    // Load the product page with retry logic
    await gotoWithRetries(page, url);

    // Wait 2 seconds to ensure page stability
    await page.waitForTimeout(2000);

    // Extract breadcrumb navigation items
    productData.breadcrumbs = await page.$$eval(
      "ol.breadcrumb.pdp-breadcrumb li.breadcrumb-item",
      (items) => items.map((item) => item.textContent.trim())
    );

    // Extract gender from URL or use fallback
    const genderMatch = url.match(/gender=([^&]+)/);
    productData.gender = genderMatch
      ? decodeURIComponent(genderMatch[1])
      : genderFallback;

    // Extract brand name
    const brandEl = await page.$("span.brand-name");
    if (brandEl)
      productData.brandName = (await brandEl.textContent())?.trim() || "";

    // Extract product title and generate handle (URL-friendly version)
    const titleEl = await page.$("span.product-name");
    if (titleEl) {
      productData.title = (await titleEl.textContent())?.trim() || "";
      productData.handle =
        productData.title.replace(/\s+/g, "_").toLowerCase() +
        "_" +
        Math.random();
    }

    // Extract SKU (Item Number)
    const skuEl = await page.$("span.product-info-stock-sku");
    if (skuEl) {
      const fullSku = (await skuEl.textContent())?.trim() || "";
      const match = fullSku.match(/Item No\. (.+)/i);
      productData.sku = match ? match[1].trim() : fullSku;
    }

    // Extract pricing information
    const originalPriceEl = await page.$(
      "div.retail-wrapper span:not(.retail-label)"
    );
    const nowPriceEl = await page.$("div.now-price span");
    const wasPriceEl = await page.$("div.was-wrapper span:not(.was-label)");

    // Handle different pricing scenarios
    if (originalPriceEl && nowPriceEl && wasPriceEl) {
      // Case 1: All three price elements exist (retail, current, was prices)
      productData.originalPrice =
        (await originalPriceEl.textContent())?.trim() || "";
      productData.priceAfterCoupon =
        (await nowPriceEl.textContent())?.trim() || "";
      productData.costPerItem = (await wasPriceEl.textContent())?.trim() || "";
    } else if (originalPriceEl && nowPriceEl) {
      // Case 2: Only retail and current prices exist
      productData.originalPrice =
        (await originalPriceEl.textContent())?.trim() || "";
      productData.costPerItem = (await nowPriceEl.textContent())?.trim() || "";
    } else if (nowPriceEl) {
      // Case 3: Only current price exists
      productData.costPerItem = (await nowPriceEl.textContent())?.trim() || "";
    }

    // Extract product description HTML
    const descriptionEl = await page.$(
      "div.show-more-text-content > div:nth-child(1)"
    );
    if (descriptionEl) {
      productData.bodyHTML = (await descriptionEl.innerHTML())?.trim() || "";
    }

    // Scroll to bottom of page to load all images
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000); // Wait for any lazy-loaded images

    // Extract additional product images
    const extraImages = await page.$$eval("div.slide-item > img", (imgs) =>
      imgs.map((img) => img.getAttribute("src")).filter(Boolean)
    );

    // Add unique images to the imageSrc array
    for (const src of extraImages) {
      if (!productData.imageSrc.includes(src)) {
        productData.imageSrc.push(src);
      }
    }
  } catch (err) {
    console.error(`Scraping error at ${url}: ${err.message}`);
  }

  return productData;
}
