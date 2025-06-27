import * as XLSX from 'xlsx';

/**
 * Generates Excel rows from product data
 * @param {ProductData} productData
 * @returns {ExcelRow[]}
 */
export function generateExcelRows(productData) {
  const rows = [];
  
  // Main row with all data
  const mainRow = {
    'Brand Name': productData.brandName,
    'Title': productData.title,
    'Handle': productData.handle,
    'SKU': productData.sku,
    'Original Price': productData.originalPrice,
    'Cost per item': productData.costPerItem,
    'Price after coupon': productData.priceAfterCoupon,
    'Body (HTML)': productData.bodyHTML,
    'Image Src': productData.imageSrc[0] || ''
  };
  rows.push(mainRow);

  // ... rest of your Excel generation code ...

  return rows;
}

/**
 * Exports data to Excel file
 * @param {ExcelRow[]} rows
 * @param {string} filename
 */
export function exportToExcel(rows, filename) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filename);
}