import { collectProductUrls } from './urlcollector.js';

const TARGET_URL = 'https://www.jomashop.com/filters/sunglasses?price=%7B%22from%22%3A100%2C%22to%22%3A300%7D&manufacturer=Alexander+Mcqueen%7CBalenciaga%7CBottega+Veneta%7CBurberry%7CBvlgari%7CCeline%7CChlo%C3%A9%7CChopard%7CDior%7CDolce+%26+Gabbana%7CEmporio+Armani%7CFendi%7CFerragamo%7CGivenchy%7CGucci%7CJimmy+Choo%7CLoewe%7CMaui+Jim%7CMoncler%7CMontblanc%7COff-White%7CPhilipp+Plein%7CPrada%7CPrada+Linea+Rossa%7CRay-Ban%7CSaint+Laurent%7CTom+Ford%7CVersace&gender=Mens&sort=saving%7Cdesc';
const MIN_DISCOUNT = 40;

async function main() {
  try {
    console.log('🚀 Starting Jomashop URL collector');
    const result = await collectProductUrls(TARGET_URL, MIN_DISCOUNT);
    
    console.log('\n📊 Collection Summary:');
    console.log(`- Total Products: ${result.summary.totalProducts}`);
    console.log(`- Category: ${result.summary.brandType}`);
    console.log(`- Minimum Discount: ${result.summary.minDiscount}%`);
    console.log('✅ Collection complete');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();