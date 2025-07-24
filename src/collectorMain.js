import { collectProductUrls } from "./urlcollector.js";

const inputObject = {
  extraTags1: ["Beauty", "women","Nails","Nail Polish","Nail Care"],
  url1: "https://www.jomashop.com/filters/makeup?beauty_group=Hair%7CNails",
  extraTags2: ["Beauty", "women","Lips","Lipstick","Lip Stain","Lip Plumpers","Lip Oil","Lip Liner","Gloss","Lip Treatments"],
  url2: "https://www.jomashop.com/filters/lip-products?department=Makeup",
  extraTags3: ["Makeup", "women","Bronzer","Concealer","Face Primer","Foundation","Highlighter","Setting Makeup","Blush","Face"],
  url3: "https://www.jomashop.com/filters/face-products?department=Makeup",
  extraTags4: ["Makeup", "women","Mascara", "Unisex","Eye Cream","Makeup Remover","Lash Serums","Eyeshadow","Eyeliner","Eyebrows","Eye Primer","Eyes"],
  url4: "https://www.jomashop.com/filters/eye-products?department=Makeup%7CSkincare&gender=Unisex%7CWomens",
  extraTags5: ["Makeup", "women","Lips","Sponges ","Brushes","Lash Tools","Blotting Papers","Makeup Tools"],
  url5: "https://www.jomashop.com/filters/makeup?beauty_product_type=Styling+Tools%7CTools",
  extraTags6: ["Makeup", "women","Scrubs & Exfoliants","Shower","Masks"],
  url6: "https://www.jomashop.com/collections/makeup/Scrubs-Foams-And-Exfoliants-Makeup~YmVhdXR5X3Byb2R1Y3RfdHlwZX5TY3J1YnMlMkMlMjBGb2FtcyUyMCUyNiUyMEV4Zm9saWFudHM",
  extraTags7: ["Makeup", "Sunscreen","Bronzing","Suncare","Eye Cream","Face Serums","Body Treatments","Face Moisturizer","Face Exfoliators","Suncare","Moisturizers","Night Cream","Body Creams","Body Care","Body Serums","Acne Treatments","Body Butters","Face Oils"],
  url7: "https://www.jomashop.com/filters/skin-care-products?department=Skincare&gender=Womens",
  extraTags8: ["Makeup","women", "Unisex","Lotion","Suncare","Eye Cream","Face Serums","Body Treatments","Face Moisturizer","Face","Bath & Shower","Moisturizers","Night Cream","Body Creams","Body Care","Body Serums","Acne Treatments","Body Butters","Setting Makeup","Hand & Foot"],
  url8: "https://www.jomashop.com/filters/bath-body?gender=Unisex%7CWomens&subtype=Bath+%26+Body%7CHealth+%26+Wellness%7CMakeup&beauty_group=Body%7CHand+%26+Foot",
  extraTags9:  ["Makeup","women","Masks", "Unisex","Kid's Haircare","Wax & Pomade","Volume &Texture","Smoothing","Hairspray","Gloss & Shine","Curl Enhancing","Hair Care","Hair Treatment","Styling Products","Heat Protectant","Hair Cleaner"],
  url9: "https://www.jomashop.com/filters/mask?subtype=Hair+Care%7CHair&gender=Unisex%7CWomens",
  extraTags10: ["Makeup", "women","Unisex",,"Sponges ","Brushes","Lash Tools","Blotting Papers","Makeup Tools"],
  url10: "https://www.jomashop.com/tools-and-brushes.html?gender=Unisex%7CWomens&subtype=Makeup%7CTools+%26+Brushes",
  extraTags11: ["Makeup","women", "Unisex","Kid's Haircare","Wax & Pomade","Volume &Texture","Smoothing","Hairspray","Gloss & Shine","Curl Enhancing","Hair Care","Hair Treatment","Styling Products","Heat Protectant","Hair Cleaner"],
  url11: "https://www.jomashop.com/filters/hair-care?department=Hair+Care&gender=Unisex%7CWomens",
  extraTags12: ["Makeup","women", "Toner","Makeup Remover","Face Wash","Balms & Oils","Lotion","Night Cream"],
  url12: "https://www.jomashop.com/filters/cleanser?gender=Womens",
  extraTags13: ["Makeup","women", "Unisex","Masks"],
  url13: "https://www.jomashop.com/filters/mask?gender=Unisex%7CWomens&subtype=Skin+Care",
 
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