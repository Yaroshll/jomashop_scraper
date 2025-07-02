// index.js
import fs from "fs";
import path from "path";
import { launchBrowser } from "./helpers/browser.js";
import { scrapeProduct } from "./helpers/scraper.js";
import { exportToExcel } from "./helpers/excel.js";

// List of product URLs to scrape
const productUrls = [
"https://www.jomashop.com/versace-dark-grey-butterfly-ladies-sunglasses-ve4460d-gb1-87-57.html",

    ]
 ;

// Collector URL for determining default gender
const collectorUrl ="https://www.jomashop.com/filters/sunglasses?price=%7B%22from%22%3A100%2C%22to%22%3A300%7D&manufacturer=Alexander+Mcqueen%7CBalenciaga%7CBottega+Veneta%7CBurberry%7CBvlgari%7CCeline%7CChlo%C3%A9%7CChopard%7CDior%7CDolce+%26+Gabbana%7CEmporio+Armani%7CFendi%7CFerragamo%7CGivenchy%7CGucci%7CJimmy+Choo%7CLoewe%7CMaui+Jim%7CMoncler%7CMontblanc%7COff-White%7CPhilipp+Plein%7CPrada%7CPrada+Linea+Rossa%7CRay-Ban%7CSaint+Laurent%7CTom+Ford%7CVersace&gender=Womens&sort=saving%7CDESC";

// Extract gender from collector URL (used as fallback)
const genderFromCollector = (collectorUrl.match(/gender=([^&]+)/i)?.[1] || "").replace(/\+/g, " ");

/**
 * Main scraping function
 */
async function main() {
  // Launch browser instance
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const allRows = []; // Stores all scraped product data

  try {
    // Process each product URL
    for (const url of productUrls) {
      console.log(`Scraping ${url}`);
      
      // Scrape product data from page
      const productData = await scrapeProduct(page, url, genderFromCollector);

      // Only proceed if we got valid data
      if (productData.title || productData.sku || productData.imageSrc.length > 0) {
        // Generate tags from product metadata
        const tags = [
          productData.gender,
          ...(productData.breadcrumbs?.slice(1, -1) || [])
        ].filter(Boolean).join(', ');

        // Create main product row
        const mainRow = {
          "Brand Name": productData.brandName,
          "Title": productData.title,
          "Handle": productData.handle,
          "SKU": productData.sku,
          "Original Price": productData.originalPrice,
          "Cost per item": productData.costPerItem,
          "Price after coupon": productData.priceAfterCoupon,
          "Body (HTML)": productData.bodyHTML,
          "Image Src": productData.imageSrc[0] || "",
          "Breadcrumbs": productData.breadcrumbs,
          "Gender": productData.gender,
          "Tags": tags ,
          "original_prodect_url": url

        };
        allRows.push(mainRow);

        // Create additional rows for extra images
        for (let i = 1; i < productData.imageSrc.length; i++) {
          allRows.push({
            "Brand Name": "",
            "Title": "",
            "Handle": productData.handle,
            "SKU": "",
            "Original Price": "",
            "Cost per item": "",
            "Price after coupon": "",
            "Body (HTML)": "",
            "Image Src": productData.imageSrc[i],
            "Breadcrumbs": [],
            "Gender": "",
            "Tags": "" // Empty for image rows
          });
        }
      } else {
        console.log(`No valid data collected from ${url}`);
      }
    }

    // Export data if we collected anything
    if (allRows.length > 0) {
      // Generate timestamped filename
      const now = new Date();
      const dateString = now.toISOString().split("T")[0];
      const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `outputs/jomashop_watch_${dateString}_${timeString}.xlsx`;

      // Export to Excel and CSV
      const { excel, csv } = await exportToExcel(allRows, filename);
      console.log(`Exported to:\n- Excel: ${excel}\n- CSV: ${csv}`);
    } else {
      console.log("No valid data collected - files not created.");
    }
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    // Always close the browser when done
    await browser.close();
  }
}

// Start the scraping process
main().catch(console.error);