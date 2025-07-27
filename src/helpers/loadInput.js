import fs from "fs/promises";
import path from "path";

/**
 * Loads the first valid input file from the URL_scraper_output folder.
 */
export async function loadInputFromJson(folder = "URL_scraper_output") {
  const files = await fs.readdir(folder);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) throw new Error("No JSON files found.");

  const firstFilePath = path.join(folder, jsonFiles[0]);
  const raw = await fs.readFile(firstFilePath, "utf-8");
  const parsed = JSON.parse(raw);

  // Extract simplified input
  const input = {};
  for (const [key, value] of Object.entries(parsed.arrays)) {
    input[key] = {
      urls: value.urls || [],
      extraTags: value.extraTags || [],
      gender: value.gender || "women",
    };
  }

  return input;
}
