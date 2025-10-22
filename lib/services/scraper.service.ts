import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { SiteDetectorService, SiteStructure } from './site-detector.service';

export interface ScrapedContent {
  title: string;
  description?: string;
  content: string;
  links: string[];
  metadata: {
    url: string;
    scrapedAt: Date;
    contentLength: number;
    author?: string;
    publishDate?: string;
    articleTitle?: string;
    price?: string;
    category?: string;
    rating?: string;
  };
  siteStructure?: SiteStructure;
}

export class ScraperService {
  /**
   * Try to find and parse sitemap.xml to discover all URLs
   */
  static async findSitemap(baseUrl: string): Promise<string[]> {
    const sitemapUrls: string[] = [];
    const commonSitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap-index.xml',
      '/sitemap1.xml',
      '/post-sitemap.xml',
      '/page-sitemap.xml',
      '/robots.txt', // Can contain sitemap location
    ];

    for (const path of commonSitemapPaths) {
      try {
        const sitemapUrl = new URL(path, baseUrl).href;
        const response = await fetch(sitemapUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RAGBot/1.0)' },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) continue;

        const content = await response.text();

        // If robots.txt, extract sitemap URLs
        if (path === '/robots.txt') {
          const sitemapMatches = content.match(/Sitemap:\s*(.+)/gi);
          if (sitemapMatches) {
            sitemapMatches.forEach(match => {
              const url = match.replace(/Sitemap:\s*/i, '').trim();
              if (url) sitemapUrls.push(url);
            });
          }
          continue;
        }

        // Parse XML sitemap
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g);
        if (urlMatches) {
          urlMatches.forEach(match => {
            let url = match.replace(/<\/?loc>/g, '');
            // Clean CDATA wrappers if present
            url = url.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

            if (url && !url.endsWith('.xml')) {
              // It's a page URL, not another sitemap
              sitemapUrls.push(url);
            } else if (url && url.endsWith('.xml')) {
              // It's a nested sitemap, we should fetch it too
              // (For now, we'll just add it to be fetched recursively)
            }
          });
        }

        console.log(`Found sitemap at ${sitemapUrl} with ${urlMatches?.length || 0} URLs`);
      } catch (error) {
        // Sitemap not found or error, continue
      }
    }

    return Array.from(new Set(sitemapUrls)); // Remove duplicates
  }

  /**
   * Scrape a website and extract its content
   */
  static async scrapeWebsite(url: string, maxPages: number = 10): Promise<ScrapedContent[]> {
    const visitedUrls = new Set<string>();
    const scrapedPages: ScrapedContent[] = [];
    const baseUrl = new URL(url);
    const baseHostname = baseUrl.hostname;

    // STRATEGY 1: Try to find sitemap first (fastest and most complete)
    console.log('🗺️  Searching for sitemap.xml...');
    const sitemapUrls = await this.findSitemap(baseUrl.origin);

    let urlsToVisit: string[] = [];

    if (sitemapUrls.length > 0) {
      console.log(`✅ Found ${sitemapUrls.length} URLs in sitemap(s)`);
      // Add sitemap URLs with priority
      urlsToVisit = [...sitemapUrls, url];
    } else {
      console.log('⚠️  No sitemap found, using crawler mode');
      urlsToVisit = [url];
    }

    // Advanced heuristics to detect if a URL is likely an article/content page
    const isArticleLink = (href: string): boolean => {
      const lower = href.toLowerCase();
      const path = href.replace(baseUrl.origin, '');

      // EXCLUDE: Known non-content patterns
      const excludePatterns = [
        '/author/', '/category/', '/tag/', '/tags/', '/categories/',
        '/page/', '/feed', '/rss', '/atom',
        '/wp-admin', '/wp-content', '/wp-includes', '/wp-json',
        '/admin/', '/login', '/register', '/sign-in', '/sign-up',
        '/search', '/cart', '/checkout', '/account',
        '/privacy', '/terms', '/legal', '/cookies',
        '/contact', '/about-us', '/sitemap',
        '.pdf', '.jpg', '.png', '.gif', '.zip', '.xml',
      ];

      for (const pattern of excludePatterns) {
        if (lower.includes(pattern)) return false;
      }

      // Exclude query params and anchors
      if (lower.includes('?') || lower.includes('#')) return false;

      // Exclude homepage
      if (lower === baseUrl.origin || lower === baseUrl.origin + '/') return false;
      if (lower === baseUrl.origin + '/en' || lower === baseUrl.origin + '/en/') return false;

      // INCLUDE: Positive signals for articles
      let score = 0;

      // 1. Has date pattern (2024/01/15, 2024-01-15, etc.)
      if (/\/\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(path)) score += 30;
      if (/\/\d{4}\//.test(path)) score += 20; // Year in path

      // 2. Common article URL patterns
      if (lower.includes('/blog/')) score += 25;
      if (lower.includes('/post/')) score += 25;
      if (lower.includes('/article/')) score += 25;
      if (lower.includes('/news/')) score += 20;
      if (lower.includes('/story/')) score += 20;

      // 3. Path depth (articles usually have deeper paths)
      const pathSegments = path.split('/').filter(Boolean);
      if (pathSegments.length >= 2) score += 15;
      if (pathSegments.length >= 3) score += 10;

      // 4. Long path (specific content)
      if (path.length > 40) score += 10;

      // 5. Has hyphens or underscores (common in slugs)
      const slugPattern = /[a-z0-9-_]{10,}/;
      if (slugPattern.test(path)) score += 15;

      // 6. Ends with common article patterns
      if (/\/[a-z0-9-]+\/?$/.test(path) && path.length > 20) score += 10;

      // Articles likely to have score > 30
      return score >= 20;
    };

    // Helper to check if French content
    const isFrenchContent = (href: string): boolean => {
      return !href.includes('/en/');
    };

    // Helper to detect if URL is likely a listing page (blog index, category, etc.)
    const isListingPage = (href: string): boolean => {
      const lower = href.toLowerCase();
      const listingPatterns = [
        '/tous-nos-articles', '/all-articles', '/articles',
        '/blog', '/posts', '/news',
        '/archive', '/archives',
      ];
      return listingPatterns.some(pattern => lower.includes(pattern));
    };

    // Track statistics
    let articlesFound = 0;
    let listingPagesFound = 0;

    while (urlsToVisit.length > 0 && scrapedPages.length < maxPages) {
      const currentUrl = urlsToVisit.shift()!;

      if (visitedUrls.has(currentUrl)) {
        continue;
      }

      try {
        const isListing = isListingPage(currentUrl);
        const isArticle = isArticleLink(currentUrl);

        console.log(`[${scrapedPages.length + 1}/${maxPages}] Scraping: ${currentUrl}`);
        if (isListing) console.log('  📄 Listing page detected');
        if (isArticle) console.log('  📰 Article detected');

        const content = await this.scrapePage(currentUrl);
        scrapedPages.push(content);
        visitedUrls.add(currentUrl);

        if (isListing) listingPagesFound++;
        if (isArticle) articlesFound++;

        console.log(`  Found ${content.links.length} links`);

        // Process and prioritize links
        const newLinks: { url: string; priority: number }[] = [];

        for (const link of content.links) {
          try {
            const linkUrl = new URL(link, currentUrl);

            // Only follow links on the same domain
            if (linkUrl.hostname !== baseHostname) continue;
            if (visitedUrls.has(linkUrl.href)) continue;

            // Calculate priority with advanced heuristics
            let priority = 0;

            if (isListingPage(linkUrl.href)) {
              priority = 1000; // ULTRA priority for listing pages (discover more articles)
            } else if (isArticleLink(linkUrl.href)) {
              // Base priority for articles
              if (isFrenchContent(linkUrl.href)) {
                priority = 100; // Very high priority for French articles
              } else {
                priority = 50; // Medium-high priority for English articles
              }

              // Bonus for date patterns (more likely to be real articles)
              if (/\/\d{4}[/-]/.test(linkUrl.href)) {
                priority += 20;
              }

              // Bonus for long descriptive URLs
              const path = linkUrl.href.replace(baseUrl.origin, '');
              if (path.length > 50) {
                priority += 10;
              }
            } else {
              priority = 1; // Low priority for other pages
            }

            newLinks.push({ url: linkUrl.href, priority });
          } catch (e) {
            // Invalid URL, skip
          }
        }

        // Sort by priority and add to queue
        newLinks.sort((a, b) => b.priority - a.priority);
        const uniqueNewLinks = newLinks
          .filter(l => !urlsToVisit.includes(l.url))
          .map(l => l.url);

        urlsToVisit.push(...uniqueNewLinks);

        console.log(`  Added ${uniqueNewLinks.length} new URLs to queue (${urlsToVisit.length} total)`);
      } catch (error) {
        console.error(`Error scraping ${currentUrl}:`, error);
      }
    }

    // Final summary and validation
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total pages scraped: ${scrapedPages.length}/${maxPages}`);
    console.log(`Articles found: ${articlesFound}`);
    console.log(`Listing pages found: ${listingPagesFound}`);
    console.log(`Other pages: ${scrapedPages.length - articlesFound - listingPagesFound}`);

    // Calculate total content
    const totalChars = scrapedPages.reduce((sum, page) => sum + page.content.length, 0);
    const avgCharsPerPage = Math.round(totalChars / scrapedPages.length);
    console.log(`Total content: ${(totalChars / 1000).toFixed(1)}K characters`);
    console.log(`Average per page: ${(avgCharsPerPage / 1000).toFixed(1)}K characters`);

    // Quality checks
    const warnings: string[] = [];

    if (articlesFound === 0) {
      warnings.push('⚠️  No articles detected - may need to adjust heuristics');
    }

    if (articlesFound < scrapedPages.length * 0.3 && scrapedPages.length > 10) {
      warnings.push('⚠️  Less than 30% articles - scraper may be getting navigation pages');
    }

    if (avgCharsPerPage < 500) {
      warnings.push('⚠️  Low content per page - may be scraping thin pages');
    }

    if (scrapedPages.length < maxPages / 2) {
      warnings.push(`⚠️  Only ${scrapedPages.length}/${maxPages} pages scraped - site may be smaller than expected`);
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(w => console.log(w));
    } else {
      console.log('\n✅ Quality checks passed!');
    }

    console.log('='.repeat(60) + '\n');

    return scrapedPages;
  }

  /**
   * Scrape a single page
   */
  static async scrapePage(url: string): Promise<ScrapedContent> {
    let browser;

    try {
      // Use Puppeteer for JavaScript-heavy sites
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Get the HTML content
      const html = await page.content();

      // Detect site type and structure
      const siteStructure = SiteDetectorService.detectSiteType(html, url);
      SiteDetectorService.logDetection(siteStructure, url);

      // Parse with Cheerio
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('header').remove();
      $('footer').remove();
      $('.advertisement').remove();
      $('.ad').remove();

      // Extract title
      const title = $('title').text() || $('h1').first().text() || 'Untitled';

      // Extract description
      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

      // Extract metadata adaptively based on site type
      const patterns = siteStructure.metadataPatterns;

      // Extract author using site-specific patterns
      let author = '';
      if (patterns.author) {
        for (const selector of patterns.author) {
          const value = $(selector).first().attr('content') || $(selector).first().text().trim();
          if (value) {
            author = value.replace(/^(Par|By|Author:|Auteur:)\s*/i, '').trim();
            break;
          }
        }
      }

      // Extract publish date using site-specific patterns
      let publishDate = '';
      if (patterns.date) {
        for (const selector of patterns.date) {
          const value = $(selector).first().attr('content') || $(selector).first().attr('datetime') || $(selector).first().text().trim();
          if (value) {
            publishDate = value;
            break;
          }
        }
      }

      // Extract category using site-specific patterns
      let category = '';
      if (patterns.category) {
        for (const selector of patterns.category) {
          const value = $(selector).first().attr('content') || $(selector).first().text().trim();
          if (value) {
            category = value;
            break;
          }
        }
      }

      // Extract price (for e-commerce)
      let price = '';
      if (patterns.price) {
        for (const selector of patterns.price) {
          const value = $(selector).first().attr('content') || $(selector).first().text().trim();
          if (value && /[\d,.$€£¥]/.test(value)) {
            price = value;
            break;
          }
        }
      }

      // Extract rating (for e-commerce/reviews)
      let rating = '';
      if (patterns.rating) {
        for (const selector of patterns.rating) {
          const value = $(selector).first().attr('content') || $(selector).first().text().trim();
          if (value) {
            rating = value;
            break;
          }
        }
      }

      // Extract article title (cleaner than page title)
      const articleTitle =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        title;

      // Extract main content using site-specific priority selectors
      const contentSelectors = [
        ...siteStructure.chunkingStrategy.prioritySelectors,
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        'body',
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element
            .text()
            .replace(/\s+/g, ' ')
            .trim();
          if (content.length > 100) {
            console.log(`  ✓ Content extracted using selector: ${selector}`);
            break;
          }
        }
      }

      // If still no content, try body
      if (!content || content.length < 100) {
        content = $('body')
          .text()
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Extract links
      const links: string[] = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.push(href);
        }
      });

      await browser.close();

      return {
        title: title.substring(0, 500),
        description: description.substring(0, 1000),
        content,
        links: Array.from(new Set(links)), // Remove duplicates
        metadata: {
          url,
          scrapedAt: new Date(),
          contentLength: content.length,
          author: author || undefined,
          publishDate: publishDate || undefined,
          articleTitle: articleTitle.substring(0, 500),
          price: price || undefined,
          category: category || undefined,
          rating: rating || undefined,
        },
        siteStructure,
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw new Error(`Failed to scrape page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simple URL validation
   */
  static isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is a website (not YouTube)
   */
  static isWebsiteUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Exclude YouTube URLs
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
