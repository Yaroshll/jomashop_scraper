import { launchBrowser } from "./helpers/browser.js";
import { scrapeProduct } from "./helpers/scraper.js";
import { exportToExcel } from "./helpers/excel.js";

const extraTags = ["men"];

const productUrls = [
  "https://www.jomashop.com/corum-admiral-cup-white-dial-mens-watch-a895-04302.html",
];

const genderFromCollector = "womens";

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
      if (
        productData.title ||
        productData.sku ||
        productData.imageSrc.length > 0
      ) {
        // Generate tags from product metadata
        const tags = [
          ...extraTags,
          ...(productData.breadcrumbs?.slice(1, -1) || []),
        ]
          .filter(Boolean)
          .join(", ");

        // Create main product row
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
          Breadcrumbs: productData.breadcrumbs,
          Gender: productData.gender,
          Tags: tags,
          original_prodect_url: url,
        };
        allRows.push(mainRow);

        // Create additional rows for extra images
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
            Breadcrumbs: [],
            Gender: "",
            Tags: "", // Empty for image rows
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
      const filename = `products_details_output/jomashop_watch_${dateString}_${timeString}.xlsx`;

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
