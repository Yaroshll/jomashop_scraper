import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const inputFilePath = 'outputs2/jomashop_watch_MEN_ADDITION (1).csv'; // Change to your input file path
const outputDir = './output4';
const outputFilePath = path.join(outputDir, 'updated_with_compare_at_price.csv');

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const rows = [];

fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on('data', (row) => {
    const priceStr = row['Variant Price'];
    const price = parseFloat(priceStr);

    const compareAt = isNaN(price) ? '' : (price * 1.4).toFixed(2);

    row['Variant Compare At Price'] = compareAt;
    rows.push(row);
  })
  .on('end', () => {
    const headers = Object.keys(rows[0]).map((header) => ({ id: header, title: header }));

    const writer = createObjectCsvWriter({
      path: outputFilePath,
      header: headers,
    });

    writer
      .writeRecords(rows)
      .then(() => console.log(`✅ File written to: ${outputFilePath}`))
      .catch((err) => console.error('❌ Error writing CSV:', err));
  })
  .on('error', (err) => {
    console.error('❌ Error reading CSV:', err);
  });
