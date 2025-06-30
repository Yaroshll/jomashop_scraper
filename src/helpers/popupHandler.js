export async function handleAllPopups(page) {
  try {
    // Handle main popup
    try {
      await page.waitForSelector("#ltkpopup-wrapper", { timeout: 5000 });
      const closeButtons = [
        ".ltkpopup-close-button button.ltkpopup-close",
        ".ltkpopup-no-thanks button",
        "button.ltkpopup-close",
      ];

      for (const selector of closeButtons) {
        try {
          await page.click(selector);
          console.log(`✅ Closed popup using selector: ${selector}`);
          await page.waitForTimeout(500);
          break;
        } catch (err) {
          continue;
        }
      }
    } catch (error) {
      // Popup not found - continue silently
      console.error(error);
    }

    try {
      await page.waitForSelector(".cookie-bar", { timeout: 5000 });
      const cookieCloseSelectors = [
        ".cookie-bar-button.cookie-cross",
        ".cookie-bar button",
        ".cookie-bar .close",
      ];

      for (const selector of cookieCloseSelectors) {
        try {
          await page.click(selector);
          console.log(`✅ Closed cookie notice using selector: ${selector}`);
          await page.waitForTimeout(500);
          break;
        } catch (err) {
          continue;
        }
      }
    } catch (error) {
      // Cookie notice not found - continue silently
    }
  } catch (error) {
    console.log("ℹ️ Error handling popups:", error.message);
  }
}
