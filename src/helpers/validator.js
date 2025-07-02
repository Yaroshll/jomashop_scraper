export function validateDiscount(discountText, minDiscount = 60) {
  const match = discountText?.match(/(\d+)%/);
  if (!match) return false;
  
  const discountValue = parseInt(match[1]);
  const isValid = discountValue >= minDiscount;
  
  if (isValid) {
    console.log(`🎯 Valid discount: ${discountText} (meets ${minDiscount}% threshold)`);
  } else {
    console.log(`✖️ Discount too low: ${discountText} (needs ${minDiscount}%)`);
  }
  
  return isValid;
}