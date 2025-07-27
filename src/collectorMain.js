import { discoverFilterUrls } from "./helpers/filterDiscovery.js";
import { collectProductUrls } from "./urlcollector.js";
import { launchBrowser } from "./helpers/browser.js";

const BASE_URL = "https://www.jomashop.com/makeup.html";
const BASE_TAGS = ["Makeup"];
const MIN_DISCOUNT = 0;

async function main() {
  try {
    console.log("🔍 Step 1: Discovering filters...");
    const inputObject = await discoverFilterUrls(BASE_URL, BASE_TAGS);

    console.log("🚀 Step 2: Scraping product URLs from discovered filters...");
    const result = await collectProductUrls(inputObject, MIN_DISCOUNT);

    console.log("\n📊 Summary:");
    console.log(`- Total Arrays: ${result.summary.totalArrays}`);
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Collected At: ${result.summary.collectedAt}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%\n`);

    for (const [arrayKey, data] of Object.entries(result.arrays)) {
      console.log(`🔹 ${arrayKey}`);
      console.log(`   - URL: ${data.summary.sourceUrl}`);
      console.log(`   - Tags: ${data.summary.tags.join(", ")}`);
      console.log(`   - Product Count: ${data.summary.productCount}`);
    }

    console.log("✅ Done!");
  } catch (error) {
    console.error("❌ Fatal Error in main():", error);
    process.exit(1);
  }
}

main();
