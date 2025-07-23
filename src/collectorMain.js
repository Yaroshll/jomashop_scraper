import fs from "fs";
import path from "path";
import { collectProductUrls } from "./urlcollector.js";

// ✅ Define all targets with optional extraTags
const TARGETS = [
  {
    url: "https://www.jomashop.com/collections/skin-care-products/Skincare-Skin-Care-Products~c3VidHlwZX5Ta2luY2FyZQ",
    extraTags: ["skincare", "body"],
  },
  {    url: "https://www.jomashop.com/filters/makeup?subtype=Bath+%26+Body%7CSkincare%7CTools+%26+Brushes",
    extraTags: ["s", "test"],
  },
];

async function main() {
  try {
    console.log("🚀 Starting Jomashop URL collector");

    const results = [];

    for (const target of TARGETS) {
      console.log(`\n➡️ Collecting from: ${target.url}`);

      const result = await collectProductUrls(
        target.url,
        0, // minDiscount
        target.extraTags
      );

      results.push(result);

      console.log("📊 Summary:");
      console.log(`- Tags: ${target.extraTags.join(", ")}`);
      console.log(`- Total Products: ${result.summary.totalProducts}`);
      console.log(`- Category: ${result.summary.brandType}`);
    }

    // ✅ Save all results in one file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = "URL_scraper_output";
    fs.mkdirSync(outputDir, { recursive: true });

    const filename = path.join(outputDir, `jomashop_combined_${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ All results saved to ${filename}`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
