const fs = require('fs');
let content = fs.readFileSync('tenant-api/src/index.js', 'utf8');

const searchWebFn = `// Helper: Search web via DuckDuckGo
async function searchWeb(query) {
  if (!query) return '';
  try {
    const searchUrl = \`https://html.duckduckgo.com/html/?q=\${encodeURIComponent(query)}\`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.result').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').attr('href');
      if (title && snippet) results.push(\`Title: \${title}\\nSnippet: \${snippet}\\nURL: \${link}\`);
    });
    return results.join('\\n\\n');
  } catch (err) {
    console.error('Failed to search web:', err.message);
    return 'Web search failed.';
  }
}

// Helper: Crawl website for agent context`;
content = content.replace(
  '// Helper: Crawl website for agent context',
  searchWebFn
);

const extractRegex =
  /const { message, model, conversationId, clientHistory, agent_id } = req.body;/;
content = content.replace(
  extractRegex,
  `const { message, model, conversationId, clientHistory, agent_id, deepSearch, reasoning } = req.body;`
);

const logicOld = `    // Check for URLs to crawl
    const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
    const urls = message.match(urlRegex) || [];
    let crawledContext = '';
    
    if (urls.length > 0) {
      const shouldDeepCrawl = message.toLowerCase().includes('crawl') || message.toLowerCase().includes('analyze') || message.toLowerCase().includes('research');
      const maxDepth = shouldDeepCrawl ? 1 : 0;
      crawledContext = await crawlWebsite(urls[0], maxDepth);
    }`;

const logicNew = `    // Check for URLs to crawl or Deep Search
    const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
    const urls = message.match(urlRegex) || [];
    let crawledContext = '';
    
    if (urls.length > 0) {
      // Crawl all found URLs
      for (const url of urls) {
        crawledContext += await crawlWebsite(url, 1) + '\\n\\n';
      }
    }
    
    if (deepSearch) {
      const searchResults = await searchWeb(message);
      crawledContext += \`\\n--- LIVE WEB SEARCH RESULTS ---\\n\${searchResults}\\n\`;
    }`;
content = content.replace(logicOld, logicNew);

fs.writeFileSync('tenant-api/src/index.js', content, 'utf8');
console.log('Successfully patched index.js for Web Search');
