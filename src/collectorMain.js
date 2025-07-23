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

    console.log("\n📊 Global Summary:");
    console.log(`- Total Arrays: ${result.summary.totalArrays}`);
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%`);
    console.log(`- Collected At: ${result.summary.collectedAt}`);

    console.log("\n🔍 Detailed Array Summaries:");
    if (result.arrays) {
      for (const [arrayKey, arrayData] of Object.entries(result.arrays)) {
        console.log(`\n${arrayKey}:`);
        console.log(`- Products: ${arrayData.summary.productCount}`);
        console.log(`- Source URL: ${arrayData.summary.sourceUrl}`);
        console.log(`- Tags: ${arrayData.summary.tags.join(", ")}`);
        console.log(`- Scraped At: ${arrayData.summary.scrapedAt}`);
      }
    } else {
      console.log("No arrays found in results");
    }

    console.log("\n✅ Collection complete");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();