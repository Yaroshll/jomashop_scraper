import { collectProductUrls } from "./urlcollector.js";

const inputObject = {
  extraTags1: ["skincare", "body"],
  url1: "https://www.jomashop.com/filters/skin-care-products?department=Skincare&beauty_group=Body",
  extraTags2: ["makeup", "eyes"],
  url2: "https://www.jomashop.com/eye-products.html",
  // Add more URL and tag pairs as needed
};

const MIN_DISCOUNT = 0;

async function main() {
  try {
    console.log("🚀 Starting Jomashop URL collector");
    const result = await collectProductUrls(inputObject, MIN_DISCOUNT);

    console.log("\n📊 Collection Summary:");
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%`);
    console.log("✅ Collection complete");
    
    // Example of accessing the results:
    console.log("\nSample Results:");
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith("array")) {
        console.log(`- ${key}: ${value.urls.length} products`);
        console.log(`  Tags: ${value.extraTags.join(", ")}`);
      }
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();