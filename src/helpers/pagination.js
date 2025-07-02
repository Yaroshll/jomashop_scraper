export async function handlePagination(page, domain, baseUrl, visitedPages, minDiscount, maxPages = 10) {
  const collectedUrls = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    try {
      // Wait for pagination to load
      await page.waitForSelector('ul.pagination', { timeout: 5000 });

      const pageLinks = await page.$$eval(
        'ul.pagination li.page-item:not(.pagination-prev):not(.pagination-next)',
        items => items.map(item => {
          const link = item.querySelector('a.page-link');
          return {
            page: parseInt(link?.textContent?.trim()) || null,
            href: link?.getAttribute('href') || null,
            disabled: item.classList.contains('disabled')
          };
        }).filter(item => item.page && item.href && !item.disabled)
      );

      const nextPage = pageLinks.find(link => 
        link.page > currentPage && !visitedPages.has(link.page)
      );

      if (!nextPage) break;

      console.log(`➡️ Navigating to page ${nextPage.page}`);
      await page.goto(`${domain}${nextPage.href}`, { waitUntil: 'domcontentloaded' });

      // Wait for products or no results
      await page.waitForFunction(() => {
        const products = document.querySelectorAll('.product-item').length > 0;
        const noResults = document.querySelector('.message.notice')?.textContent.includes('no results');
        return products || noResults;
      }, { timeout: 15000 });

      // Check if page has products
      const products = await page.$$('.product-item');
      if (products.length === 0) break;

      const pageUrls = await collectFromPage(page, domain, minDiscount);
      collectedUrls.push(...pageUrls);
      visitedPages.add(nextPage.page);
      currentPage = nextPage.page;
    } catch (error) {
      console.warn('⚠️ Pagination error:', error.message);
      break;
    }
  }

  return collectedUrls;
}