import { collectProductUrls } from "./urlcollector.js";

const TARGET_URL = `https://www.jomashop.com/filters/makeup?department=Makeup&beauty_group=Eyes&beauty_product_type=Eyebrow+Liner%7CEyebrows%7CEyelashes%7CEyeliner%7CEyeshadow%7CEyeshadow+Palette%7CLiner%7CMascara`;
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
