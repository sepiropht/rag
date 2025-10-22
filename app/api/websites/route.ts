import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ScraperService } from '@/lib/services/scraper.service';
import { RAGService } from '@/lib/services/rag.service';

// Force dynamic rendering to avoid build-time execution
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const websites = await prisma.website.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(websites);
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !ScraperService.isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!ScraperService.isWebsiteUrl(url)) {
      return NextResponse.json({ error: 'Only website URLs are supported' }, { status: 400 });
    }

    // Create website record
    const website = await prisma.website.create({
      data: {
        url,
        title: 'Processing...',
        status: 'processing',
      },
    });

    // Process website in the background
    processWebsite(website.id, url).catch(console.error);

    return NextResponse.json(website);
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json({ error: 'Failed to create website' }, { status: 500 });
  }
}

async function processWebsite(websiteId: string, url: string) {
  try {
    console.log(`Starting to process website: ${url}`);

    // Scrape the website
    const scrapedPages = await ScraperService.scrapeWebsite(url, 10);

    if (scrapedPages.length === 0) {
      await prisma.website.update({
        where: { id: websiteId },
        data: { status: 'failed' },
      });
      return;
    }

    // Update website with title and description
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        title: scrapedPages[0]?.title || 'Untitled',
        description: scrapedPages[0]?.description || null,
      },
    });

    // Process each page and store embeddings
    for (const page of scrapedPages) {
      await RAGService.processWebsiteContent(
        websiteId,
        page.content,
        {
          url: page.metadata.url,
          title: page.title,
          author: page.metadata.author,
          publishDate: page.metadata.publishDate,
          articleTitle: page.metadata.articleTitle,
        },
        page.siteStructure?.chunkingStrategy
      );
    }

    // Mark as completed
    await prisma.website.update({
      where: { id: websiteId },
      data: { status: 'completed' },
    });

    console.log(`Website processing completed: ${websiteId}`);
  } catch (error) {
    console.error(`Error processing website ${websiteId}:`, error);
    await prisma.website.update({
      where: { id: websiteId },
      data: { status: 'failed' },
    });
  }
}
