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
    products: [], // 👈 كل المنتجات مدموجة هنا
    summary: {
      totalProducts: 0,
      collectedAt: new Date().toISOString(),
      minDiscount,
    },
  };

  try {
    for (const [key, value] of Object.entries(inputObject)) {
      if (!key.startsWith("url")) continue;

      const arrayNumber = key.substring(3);
      const categoryUrl = value;
      const extraTags = inputObject[`extraTags${arrayNumber}`] || [];

      console.log(`🚀 Processing URL: ${categoryUrl}`);

      let currentUrl = categoryUrl;
      let pageNumber = 1;
      let visited = new Set();

      while (currentUrl && !visited.has(currentUrl)) {
        visited.add(currentUrl);
        console.log(`➡️ Scraping page ${pageNumber}`);

        await page.goto(currentUrl, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        await waitForProductList(page);
        await handleAllPopups(page);

        const newProducts = await extractProductUrls(
          page,
          domain,
          minDiscount,
          extraTags,
          categoryUrl
        );

        console.log(`  + Found ${newProducts.length} products`);
        results.products.push(...newProducts);

        const nextUrl = await page.evaluate((domain) => {
          const nextBtn = document.querySelector(
            "ul.pagination li.pagination-next a.page-link[href]"
          );
          if (!nextBtn) return null;
          const href = nextBtn.getAttribute("href");
          return href.startsWith("http") ? href : domain + href;
        }, domain);

        if (nextUrl && !visited.has(nextUrl)) {
          currentUrl = nextUrl;
          pageNumber++;
        } else {
          break;
        }
      }
    }

    // إزالة التكرار حسب URL
    const map = new Map();
    results.products.forEach((p) => map.set(p.url, p));
    results.products = Array.from(map.values());

    results.summary.totalProducts = results.products.length;

    return results;
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    throw error;
  } finally {
    // ✅ الحفظ الإجباري مهما صار
    try {
      const filename = saveResults(results);
      console.log(`💾 Results saved to ${filename}`);
    } catch (e) {
      console.error("❌ Failed to save results:", e);
    }

    await context.close();
    await browser.close();
  }
}

async function waitForProductList(page) {
  for (let i = 1; i <= 20; i++) {
    await page.evaluate((p) => {
      window.scrollTo({
        top: document.body.scrollHeight * (p / 20),
        behavior: "smooth",
      });
    }, i);
    await page.waitForTimeout(500);
  }

  await page.waitForFunction(() => {
    const products = document.querySelectorAll(
      "ul.productsList li.productItem, ul.ProductListingResults__productList li.ProductListingResults__productCard"
    );
    return products.length > 0;
  }, { timeout: 20000 });
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
          // ===== Skip tester =====
          if (
            product.querySelector(
              'span.tag-item.tester-label svg[viewBox="0 0 24 24"]'
            )
          )
            return null;

          // ===== Discount detection (mobile-safe) =====
          const discountEl =
            product.querySelector(".tag-item.discount-label") ||
            product.querySelector(".ProductCard__discount");

          if (minDiscount && !discountEl) return null;

          let discountValue = null;

          if (discountEl) {
            const text = discountEl.textContent;
            const match = text.match(/(\d{1,3})/); // 👈 أي رقم
            if (match) discountValue = parseInt(match[1], 10);
          }

          if (
            minDiscount &&
            discountValue !== null &&
            discountValue < minDiscount
          ) {
            return null;
          }

          // ===== Out of stock detection =====
          const outOfStock = Boolean(
            product.querySelector(
              ".out-of-stock, .sold-out, button[disabled]"
            ) ||
              /sold out|out of stock/i.test(product.textContent)
          );

          const link = product.querySelector(
            "a.productName-link, a.ProductCard__link"
          );

          if (!link) return null;

          return {
            url: domain + link.getAttribute("href"),
            outOfStock,
          };
        })
        .filter(Boolean);
    },
    { domain, minDiscount }
  );
}



function saveResults(output) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = "URL_scraper_output";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = path.join(
    outputDir,
    `jomashop_products_${timestamp}.json`
  );

  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  return filename;
}
