import { collectProductUrls } from "./urlcollector.js";

const TARGET_URL = `https://www.jomashop.com/collections/makeup/Brows-Makeup~YmVhdXR5X2dyb3VwfkJyb3dz`;
const MIN_DISCOUNT = 0;

async function main() {
  try {
    console.log("🚀 Starting Jomashop URL collector");
    const result = await collectProductUrls(TARGET_URL, MIN_DISCOUNT);

    console.log("\n📊 Collection Summary:");
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Category: ${result.summary.brandType}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%`);
    console.log("✅ Collection complete");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
