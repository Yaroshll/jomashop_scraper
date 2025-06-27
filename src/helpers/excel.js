import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export async function exportToExcel(rows, filename) {
  if (!rows || rows.length === 0) {
    throw new Error('No valid data to export');
  }

  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  XLSX.writeFile(workbook, filename);
  return filename;
}
