// helpers/excel.js
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

/**
 * Exports product data to Excel and CSV formats
 * @param {Array} rows - Array of product data objects
 * @param {string} filename - Output filename (without path)
 * @returns {Promise<{excel: string, csv: string}>} Paths to generated files
 */
export async function exportToExcel(rows, filename) {
  try {
    // Create outputs directory if it doesn't exist
    if (!fs.existsSync("products_details_output")) {
      fs.mkdirSync("products_details_output", { recursive: true });
    }

    // 1. Save Excel file (original format)
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, filename);

    // 2. Generate CSV from the Excel data (Shopify format)
    const csvFilename = filename.replace(".xlsx", ".csv");
    const shopifyData = convertToShopifyFormat(rows);
    const csvContent = generateCSVContent(shopifyData);
    fs.writeFileSync(csvFilename, csvContent);

    return { excel: filename, csv: csvFilename };
  } catch (error) {
    console.error("Export error:", error);
    throw error;
  }
}

/**
 * Converts scraped data to Shopify import format
 * @param {Array} rows - Array of product data objects
 * @returns {Array} Shopify-formatted product data
 */
function convertToShopifyFormat(rows) {
  return rows.map((row) => {
    // Check if this is an image-only row (for additional product images)
    const isImageOnly = !row["Title"] && !row["SKU"] && !row["Original Price"];

    if (isImageOnly) {
      return {
        Handle: row["Handle"],
        "Image Src": row["Image Src"],
      };
    }

    // Calculate pricing for Shopify (with markup and rounding)
    const cost = parsePrice(row["Cost per item"]);
    const calculatedCost = (cost * 3.675).toFixed(2); // Apply cost multiplier
    const basePrice = calculatedCost * 1.3; // Add 30% markup
    const min = 0.15;
    const max = 0.3;
    const randomPercent = min + Math.random() * (max - min);
    const compareAtPrice = Math.round(basePrice * (1 + randomPercent));
    const variantPrice = Math.floor(basePrice); // Round down to whole number

    /**
     * Normalizes gender values for Shopify
     * @param {string} gender - Raw gender string from scraped data
     * @returns {string} Standardized gender value
     */
    function normalizeGender(gender) {
      const g = (gender || "").toLowerCase();

      if (g.includes("women") || g.includes("womens")) return "female";
      if (g.includes("men") || g.includes("mens")) return "male";
      return ""; // Return empty if gender not specified
    }

    // Return Shopify-formatted product data
    return {
      Handle: row["Handle"],
      Title: `${row["Brand Name"] || ""}, ${row["Title"] || ""}`.trim(),
      "Body (HTML)": row["Body (HTML)"],
      "Variant SKU": row["SKU"],
      "Variant Price": variantPrice,
      "Image Src": row["Image Src"],
      "Cost per item": calculatedCost,
      "Variant Image": row["Image Src"],
      "Variant Fulfillment Service": "manual",
      "Variant Inventory Policy": "deny",
      "Variant Inventory Tracker": "shopify",
      "Google Shopping / Gender": normalizeGender(row["Gender"]),
      Type: "USA Products",
      Vendor: "Joma Shop",
      Tags: row["Tags"],
      Status: "Active",
      Published: "TRUE",
      "Variant Compare At Price": compareAtPrice,
      "product.metafields.custom.original_prodect_url":
        row["original_prodect_url"] || "",
    };
  });
}

/**
 * Parses price strings into numbers
 * @param {string} priceStr - Price string (may contain currency symbols)
 * @returns {number} Parsed price as float
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // Remove all non-numeric characters except decimal point
  const numericStr = priceStr.replace(/[^\d.]/g, "");
  return parseFloat(numericStr) || 0;
}

/**
 * Generates CSV content from data array
 * @param {Array} data - Array of objects to convert to CSV
 * @returns {string} CSV-formatted string
 */
function generateCSVContent(data) {
  if (data.length === 0) return "";

  // Get headers from first object's keys
  const headers = Object.keys(data[0]);

  // Generate CSV rows with proper escaping
  const rows = data.map((obj) =>
    headers.map(
      (header) => `"${(obj[header] || "").toString().replace(/"/g, '""')}"`
    )
  );

  // Combine headers and rows into final CSV string
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}
