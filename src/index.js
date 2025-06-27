import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { scrapeProduct } from "./helpers/scraper.js";
import { exportToExcel } from "./helpers/excel.js";

const productUrls = [
  "https://www.jomashop.com/tissot-prx-powermatic-80-automatic-champagne-dial-ladies-watch-t1372073302100.html",
];

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const allRows = [];

  try {
    for (const url of productUrls) {
      console.log(`Scraping ${url}`);
      const productData = await scrapeProduct(page, url);

      if (
        productData.title ||
        productData.sku ||
        productData.imageSrc.length > 0
      ) {
        const mainRow = {
          "Brand Name": productData.brandName,
          Title: productData.title,
          Handle: productData.handle,
          SKU: productData.sku,
          "Original Price": productData.originalPrice,
          "Cost per item": productData.costPerItem,
          "Price after coupon": productData.priceAfterCoupon,
          "Body (HTML)": productData.bodyHTML,
          "Image Src": productData.imageSrc[0] || "",
        };
        allRows.push(mainRow);

        for (let i = 1; i < productData.imageSrc.length; i++) {
          allRows.push({
            "Brand Name": "",
            Title: "",
            Handle: productData.handle,
            SKU: "",
            "Original Price": "",
            "Cost per item": "",
            "Price after coupon": "",
            "Body (HTML)": "",
            "Image Src": productData.imageSrc[i],
          });
        }
      } else {
        console.log(`No valid data collected from ${url}`);
      }
    }

    if (allRows.length > 0) {
      const now = new Date();
      const dateString = now.toISOString().split("T")[0];
      const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `outputs/jomashop_watch_${dateString}_${timeString}.xlsx`;
      const savedPath = await exportToExcel(allRows, filename);
      console.log(`Exported to ${savedPath}`);
    } else {
      console.log("No valid data collected - file not created.");
    }
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
