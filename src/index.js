import { addSyntheticLeadingComment } from "typescript";
import { collectProductUrls } from "./scraper.js";

const TARGET_URL =
  "https://www.jomashop.com/filters/watches?item_condition=Condition%3A+New&manufacturer=Breitling%7CBvlgari%7CCarl+F.+Bucherer%7CBaume+Et+Mercier%7CCartier%7CChopard%7CCorum%7CBlancpain%7CDior%7CEbel%7CFerragamo%7CFranck+Muller%7CGirard+Perregaux%7CGevril%7CGucci%7CGv2+By+Gevril%7CHamilton%7CHarry+Winston%7CHermes%7CHublot%7CIWC%7CJaeger+LeCoultre%7CLocman%7CLongines%7CMichele%7CMichel+Jordi%7CMovado%7COmega%7CPiaget%7CRado%7CTag+Heuer%7CTudor%7CUlysse+Nardin%7CVacheron+Constantin%7CVan+Cleef+%26+Arpels%7CVersace%7CZenith%7CChanel&subtype=Watches&get_it_fast=Yes&gender=Mens&sort=saving%7Cdesc";
const MIN_DISCOUNT = 40;

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
