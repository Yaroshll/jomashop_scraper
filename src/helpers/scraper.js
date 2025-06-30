/**
 * @typedef {import('../interfaces.js').ProductData} ProductData
 */

async function gotoWithRetries(page, url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await page.goto(url, { timeout: 60000 });

      await page.waitForFunction(
        () => {
          return document.querySelector("span.brand-name");
        },
        { timeout: 20000 }
      );

      return;
    } catch (error) {
      console.warn(
        `Retry ${i + 1}/${retries}: Failed to load ${url} - ${error.message}`
      );
      if (i === retries) throw error;
      await page.waitForTimeout(20000);
    }
  }
}

export async function scrapeProduct(page, url) {
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
  };

  try {
    await gotoWithRetries(page, url);
    await page.waitForTimeout(20000);

    // Brand Name
    const brandEl = await page.$("span.brand-name");
    if (brandEl) {
      productData.brandName = (await brandEl.textContent())?.trim() || "";
    } else {
      console.log(`No brand-name at ${url}`);
    }

    // Title
    const titleEl = await page.$("span.product-name");
    if (titleEl) {
      productData.title = (await titleEl.textContent())?.trim() || "";
      productData.handle = productData.title.replace(/\s+/g, "_");
    } else {
      console.log(`No product-name at ${url}`);
    }

    // SKU
    const skuEl = await page.$("span.product-info-stock-sku");
    if (skuEl) {
      const fullSku = (await skuEl.textContent())?.trim() || "";
      const match = fullSku.match(/Item No\. (.+)/i);
      productData.sku = match ? match[1].trim() : fullSku;
    } else {
      console.log(`No SKU at ${url}`);
    }

    // Determine pricing structure
    const hasDiscount = (await page.$("span.tag-item.discount-label")) !== null;
    // Check all relevant price elements
    const originalPriceEl = await page.$(
      "div.retail-wrapper span:not(.retail-label)"
    );
    const nowPriceEl = await page.$("div.now-price span");
    const wasPriceEl = await page.$("div.was-wrapper span:not(.was-label)");

    // Case 1: All 3 prices exist → Full discount structure
    if (originalPriceEl && nowPriceEl && wasPriceEl) {
      productData.originalPrice =
        (await originalPriceEl.textContent())?.trim() || "";
      productData.priceAfterCoupon =
        (await nowPriceEl.textContent())?.trim() || "";
      productData.costPerItem = (await wasPriceEl.textContent())?.trim() || "";
    }

    // Case 2: Only original and now price → Basic discount
    else if (originalPriceEl && nowPriceEl) {
      productData.originalPrice =
        (await originalPriceEl.textContent())?.trim() || "";
      productData.costPerItem = (await nowPriceEl.textContent())?.trim() || "";
    }

    // Case 3: Only now-price → No discount
    else if (nowPriceEl) {
      productData.costPerItem = (await nowPriceEl.textContent())?.trim() || "";
    }
    // Description - second inner <div> inside .show-more-text-content
    const descriptionEl = await page.$(
      "div.show-more-text-content > div:nth-child(1)"
    );
    if (descriptionEl) {
      productData.bodyHTML = (await descriptionEl.innerHTML())?.trim() || "";
    } else {
      console.log(`No product description at ${url}`);
    }

    // Images
    // Scroll to bottom to trigger lazy-loaded images
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(20000);

    // 1. Main image
    // const mainImg = await page.$('img#product-main-image-gallery');
    // if (mainImg) {
    //   const src = await mainImg.getAttribute('src');
    //   if (src) {
    //     productData.imageSrc.push(src);
    //   }
    // } else {
    //   console.log(`No main image at ${url}`);
    // }

    // 2. Additional images (ensure no duplicate with main)
    const extraImages = await page.$$eval("div.slide-item > img", (imgs) =>
      imgs.map((img) => img.getAttribute("src")).filter(Boolean)
    );

    for (const src of extraImages) {
      if (!productData.imageSrc.includes(src)) {
        productData.imageSrc.push(src);
      }
    }

    if (productData.imageSrc.length === 0) {
      console.log(`No images found at ${url}`);
    }
  } catch (err) {
    console.error(`Scraping error at ${url}: ${err.message}`);
  }

  return productData;
}
