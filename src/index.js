import { launchBrowser } from "./helpers/browser.js";
import { scrapeProduct } from "./helpers/scraper.js";
import { exportToExcel } from "./helpers/excel.js";
import { loadInputFromJson } from "./helpers/loadInput.js";

// Input object with URLs, tags, and gender per group
const input = await loadInputFromJson("URL_scraper_output");
/**
 * Main scraping function
 */
async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const allRows = [];


  
  try {
    for (const [groupName, groupData] of Object.entries(input)) {
      const { urls, extraTags = [], gender = "women" } = groupData;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(
          `(${groupName}) Scraping ${i + 1}/${urls.length} -- ${url}`
        );

        const productData = await scrapeProduct(page, url, gender);

        if (
          productData.title ||
          productData.sku ||
          productData.imageSrc.length > 0
        ) {
          const tags = [
            ...extraTags,
            ...(productData.breadcrumbs?.slice(1, -1) || []),
          ]
            .filter(Boolean)
            .join(", ");

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

          for (let j = 1; j < productData.imageSrc.length; j++) {
            allRows.push({
              "Brand Name": "",
              Title: "",
              Handle: productData.handle,
              SKU: "",
              "Original Price": "",
              "Cost per item": "",
              "Price after coupon": "",
              "Body (HTML)": "",
              "Image Src": productData.imageSrc[j],
              Breadcrumbs: [],
              Gender: "",
              Tags: "",
            });
          }
        } else {
          console.log(`No valid data collected from ${url}`);
        }
      }
    }

    if (allRows.length > 0) {
      const now = new Date();
      const dateString = now.toISOString().split("T")[0];
      const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `products_details_output/jomashop_watch_${dateString}_${timeString}.xlsx`;

      const { excel, csv } = await exportToExcel(allRows, filename);
      console.log(`Exported to:\n- Excel: ${excel}\n- CSV: ${csv}`);
    } else {
      console.log("No valid data collected - files not created.");
    }
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
