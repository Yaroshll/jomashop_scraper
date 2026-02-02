import { collectProductUrls } from "./urlcollector.js";

// Configuration - change these values as needed
const TARGET_URL = "https://www.jomashop.com/watches.html?sort=saving%7Cdesc&p=830"; // Example: Philipp Plein category
const MIN_DISCOUNT = 1; // Minimum discount percentage (set to 0 to ignore discounts)

async function main() {
  try {
    console.log("🚀 Starting Jomashop Product Collector");
    const result = await collectProductUrls(TARGET_URL, MIN_DISCOUNT);

    console.log("\n📊 Collection Summary:");
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Category: ${result.summary.brandType}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%`);
    console.log(`- Output File: ${result.summary.filename || 'N/A'}`);
    console.log("✅ Collection complete");
    
    // Show sample of collected data
    if (result.products && Object.keys(result.products).length > 0) {
      console.log("\n🔍 Sample collected data:");
      const firstArray = Object.values(result.products)[0];
      if (firstArray && firstArray.length > 0) {
        console.log(JSON.stringify(firstArray[0], null, 2));
      }
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
