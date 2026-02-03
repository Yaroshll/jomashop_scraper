import { collectProductUrls } from "./urlcollector.js";

// Configuration - change these values as needed
const TARGET_URL = "https://www.jomashop.com/filters/sunglasses?price=%7B%22from%22%3A100%2C%22to%22%3A300%7D&manufacturer=Alexander+Mcqueen%7CBalenciaga%7CBottega+Veneta%7CBurberry%7CBvlgari%7CCeline%7CChlo%C3%A9%7CChopard%7CDior%7CDolce+%26+Gabbana%7CEmporio+Armani%7CFendi%7CFerragamo%7CGivenchy%7CGucci%7CJimmy+Choo%7CLoewe%7CMaui+Jim%7CMoncler%7CMontblanc%7COff-White%7CPhilipp+Plein%7CPrada%7CPrada+Linea+Rossa%7CRay-Ban%7CSaint+Laurent%7CTom+Ford%7CVersace&sort=price_desc%7Cdesc"; // Example: Philipp Plein category
const MIN_DISCOUNT = 40; // Minimum discount percentage (set to 0 to ignore discounts)

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
