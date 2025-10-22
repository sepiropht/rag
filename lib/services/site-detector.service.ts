import * as cheerio from 'cheerio';

export enum SiteType {
  BLOG = 'blog',
  DOCUMENTATION = 'documentation',
  ECOMMERCE = 'ecommerce',
  MARKETING = 'marketing',
  NEWS = 'news',
  FORUM = 'forum',
  UNKNOWN = 'unknown',
}

export interface SiteStructure {
  type: SiteType;
  confidence: number; // 0-1
  indicators: string[];
  chunkingStrategy: ChunkingStrategy;
  metadataPatterns: MetadataPatterns;
}

export interface ChunkingStrategy {
  preferredSize: number;
  overlap: number;
  respectBoundaries: 'paragraph' | 'section' | 'heading' | 'page';
  prioritySelectors: string[];
}

export interface MetadataPatterns {
  author?: string[];
  date?: string[];
  category?: string[];
  price?: string[];
  rating?: string[];
}

export class SiteDetectorService {
  /**
   * Detect site type by analyzing HTML structure and patterns
   */
  static detectSiteType(html: string, url: string): SiteStructure {
    const $ = cheerio.load(html);
    const scores: Record<SiteType, number> = {
      [SiteType.BLOG]: 0,
      [SiteType.DOCUMENTATION]: 0,
      [SiteType.ECOMMERCE]: 0,
      [SiteType.MARKETING]: 0,
      [SiteType.NEWS]: 0,
      [SiteType.FORUM]: 0,
      [SiteType.UNKNOWN]: 0,
    };

    const indicators: string[] = [];

    // === BLOG DETECTION ===
    if ($('[class*="post"]').length > 0) {
      scores[SiteType.BLOG] += 20;
      indicators.push('Post classes found');
    }
    if ($('[class*="article"]').length > 0) {
      scores[SiteType.BLOG] += 20;
      indicators.push('Article classes found');
    }
    if ($('[class*="author"]').length > 0) {
      scores[SiteType.BLOG] += 15;
      indicators.push('Author elements found');
    }
    if ($('meta[property="article:published_time"]').length > 0) {
      scores[SiteType.BLOG] += 25;
      indicators.push('Article meta tags found');
    }
    if ($('[class*="comment"]').length > 5) {
      scores[SiteType.BLOG] += 10;
      indicators.push('Comment section found');
    }
    if (/blog|article|post/i.test(url)) {
      scores[SiteType.BLOG] += 15;
      indicators.push('Blog-related URL');
    }

    // === DOCUMENTATION DETECTION ===
    if ($('nav[class*="sidebar"]').length > 0 || $('[class*="toc"]').length > 0) {
      scores[SiteType.DOCUMENTATION] += 25;
      indicators.push('Navigation sidebar/TOC found');
    }
    if ($('code, pre').length > 10) {
      scores[SiteType.DOCUMENTATION] += 20;
      indicators.push('Many code blocks found');
    }
    if ($('[class*="breadcrumb"]').length > 0) {
      scores[SiteType.DOCUMENTATION] += 15;
      indicators.push('Breadcrumb navigation found');
    }
    if (/docs|documentation|api|reference|guide/i.test(url)) {
      scores[SiteType.DOCUMENTATION] += 25;
      indicators.push('Documentation URL pattern');
    }
    if ($('h1, h2, h3, h4').length > 15) {
      scores[SiteType.DOCUMENTATION] += 10;
      indicators.push('Many headings (structured content)');
    }

    // === E-COMMERCE DETECTION ===
    if ($('[class*="product"]').length > 3) {
      scores[SiteType.ECOMMERCE] += 25;
      indicators.push('Product elements found');
    }
    if ($('[class*="price"]').length > 3) {
      scores[SiteType.ECOMMERCE] += 20;
      indicators.push('Price elements found');
    }
    if ($('[class*="cart"], [class*="basket"]').length > 0) {
      scores[SiteType.ECOMMERCE] += 25;
      indicators.push('Shopping cart found');
    }
    if ($('[class*="add-to-cart"], button[class*="buy"]').length > 0) {
      scores[SiteType.ECOMMERCE] += 20;
      indicators.push('Buy buttons found');
    }
    if ($('meta[property="product:price"]').length > 0) {
      scores[SiteType.ECOMMERCE] += 25;
      indicators.push('Product meta tags found');
    }
    if (/shop|store|product|checkout/i.test(url)) {
      scores[SiteType.ECOMMERCE] += 15;
      indicators.push('E-commerce URL pattern');
    }

    // === MARKETING/LANDING PAGE DETECTION ===
    if ($('[class*="hero"], [class*="banner"]').length > 0) {
      scores[SiteType.MARKETING] += 15;
      indicators.push('Hero/banner section found');
    }
    if ($('[class*="cta"], button[class*="sign-up"], button[class*="get-started"]').length > 2) {
      scores[SiteType.MARKETING] += 20;
      indicators.push('Multiple CTAs found');
    }
    if ($('[class*="testimonial"], [class*="review"]').length > 2) {
      scores[SiteType.MARKETING] += 15;
      indicators.push('Testimonials found');
    }
    if ($('[class*="pricing"], [class*="plan"]').length > 0) {
      scores[SiteType.MARKETING] += 20;
      indicators.push('Pricing section found');
    }
    if ($('form[class*="contact"], form[class*="lead"]').length > 0) {
      scores[SiteType.MARKETING] += 15;
      indicators.push('Lead capture form found');
    }

    // === NEWS DETECTION ===
    if ($('[class*="headline"]').length > 5) {
      scores[SiteType.NEWS] += 20;
      indicators.push('Multiple headlines found');
    }
    if ($('time[datetime]').length > 5) {
      scores[SiteType.NEWS] += 15;
      indicators.push('Many timestamps found');
    }
    if ($('[class*="breaking"], [class*="latest"]').length > 0) {
      scores[SiteType.NEWS] += 20;
      indicators.push('Breaking/latest news indicators');
    }
    if (/news|press|media/i.test(url)) {
      scores[SiteType.NEWS] += 15;
      indicators.push('News URL pattern');
    }

    // === FORUM DETECTION ===
    if ($('[class*="thread"], [class*="topic"]').length > 3) {
      scores[SiteType.FORUM] += 25;
      indicators.push('Thread/topic elements found');
    }
    if ($('[class*="reply"], [class*="post"]').length > 10) {
      scores[SiteType.FORUM] += 20;
      indicators.push('Many posts/replies found');
    }
    if ($('[class*="user"], [class*="member"]').length > 5) {
      scores[SiteType.FORUM] += 15;
      indicators.push('User/member indicators');
    }
    if (/forum|community|discussion/i.test(url)) {
      scores[SiteType.FORUM] += 20;
      indicators.push('Forum URL pattern');
    }

    // Find highest score
    let detectedType = SiteType.UNKNOWN;
    let maxScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as SiteType;
      }
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(maxScore / 100, 1);

    // Get chunking strategy based on type
    const chunkingStrategy = this.getChunkingStrategy(detectedType);
    const metadataPatterns = this.getMetadataPatterns(detectedType);

    return {
      type: detectedType,
      confidence,
      indicators,
      chunkingStrategy,
      metadataPatterns,
    };
  }

  /**
   * Get optimal chunking strategy for site type
   */
  private static getChunkingStrategy(type: SiteType): ChunkingStrategy {
    switch (type) {
      case SiteType.BLOG:
        return {
          preferredSize: 1000,
          overlap: 200,
          respectBoundaries: 'paragraph',
          prioritySelectors: ['article', 'main', '.post-content', '.entry-content'],
        };

      case SiteType.DOCUMENTATION:
        return {
          preferredSize: 800,
          overlap: 150,
          respectBoundaries: 'section',
          prioritySelectors: ['article', 'main', '.content', '[role="main"]', '.markdown'],
        };

      case SiteType.ECOMMERCE:
        return {
          preferredSize: 500,
          overlap: 100,
          respectBoundaries: 'page', // Each product = separate chunk
          prioritySelectors: ['.product', '.item', '[itemtype*="Product"]'],
        };

      case SiteType.MARKETING:
        return {
          preferredSize: 600,
          overlap: 150,
          respectBoundaries: 'section',
          prioritySelectors: ['.hero', '.section', '.feature', 'main'],
        };

      case SiteType.NEWS:
        return {
          preferredSize: 1200,
          overlap: 200,
          respectBoundaries: 'paragraph',
          prioritySelectors: ['article', '.article-body', '.story-content'],
        };

      case SiteType.FORUM:
        return {
          preferredSize: 600,
          overlap: 100,
          respectBoundaries: 'page', // Each thread/post separate
          prioritySelectors: ['.post', '.thread', '.message'],
        };

      default:
        return {
          preferredSize: 1000,
          overlap: 200,
          respectBoundaries: 'paragraph',
          prioritySelectors: ['article', 'main', 'body'],
        };
    }
  }

  /**
   * Get metadata extraction patterns for site type
   */
  private static getMetadataPatterns(type: SiteType): MetadataPatterns {
    const patterns: MetadataPatterns = {};

    switch (type) {
      case SiteType.BLOG:
      case SiteType.NEWS:
        patterns.author = [
          'meta[name="author"]',
          'meta[property="article:author"]',
          '.author',
          '.byline',
          '[rel="author"]',
          '[class*="author"]',
        ];
        patterns.date = [
          'meta[property="article:published_time"]',
          'time[datetime]',
          '.publish-date',
          '.entry-date',
          '[class*="date"]',
        ];
        patterns.category = [
          'meta[property="article:section"]',
          '.category',
          '[class*="category"]',
          'a[rel="category"]',
        ];
        break;

      case SiteType.ECOMMERCE:
        patterns.price = [
          'meta[property="product:price:amount"]',
          '[class*="price"]',
          '[itemprop="price"]',
          '.product-price',
        ];
        patterns.rating = [
          '[itemprop="ratingValue"]',
          '[class*="rating"]',
          '[class*="stars"]',
        ];
        patterns.category = [
          'meta[property="product:category"]',
          '.breadcrumb',
          '[class*="category"]',
        ];
        break;

      case SiteType.DOCUMENTATION:
        patterns.category = [
          '.breadcrumb',
          'nav[class*="sidebar"] a.active',
          '[class*="section"]',
        ];
        patterns.date = [
          'meta[name="revised"]',
          '.last-updated',
          '[class*="updated"]',
        ];
        break;

      case SiteType.FORUM:
        patterns.author = [
          '[class*="username"]',
          '[class*="member"]',
          '.author',
        ];
        patterns.date = [
          'time[datetime]',
          '[class*="timestamp"]',
          '[class*="date"]',
        ];
        break;
    }

    return patterns;
  }

  /**
   * Log detection results
   */
  static logDetection(structure: SiteStructure, url: string): void {
    console.log(`\n🔍 Site Type Detection for: ${url}`);
    console.log(`   Type: ${structure.type.toUpperCase()}`);
    console.log(`   Confidence: ${(structure.confidence * 100).toFixed(0)}%`);
    console.log(`   Indicators:`);
    structure.indicators.forEach(ind => console.log(`     - ${ind}`));
    console.log(`   Chunking: ${structure.chunkingStrategy.preferredSize} chars, ${structure.chunkingStrategy.overlap} overlap`);
    console.log(`   Boundary: ${structure.chunkingStrategy.respectBoundaries}`);
  }
}
