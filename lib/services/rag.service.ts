import prisma from '../prisma';
import OpenAI from 'openai';
import { ChunkingStrategy } from './site-detector.service';
import { AdaptiveChunkerService } from './adaptive-chunker.service';

// Use OpenAI directly for embeddings (OpenRouter doesn't support embeddings API)
const openaiEmbeddings = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use OpenRouter for chat completions
const openRouterChat = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

export interface ContentChunk {
  content: string;
  metadata: {
    url: string;
    title: string;
    author?: string;
    publishDate?: string;
    articleTitle?: string;
    chunkIndex: number;
  };
}

export interface EmbeddedChunk extends ContentChunk {
  embedding: number[];
}

export class RAGService {
  /**
   * Split text into chunks with overlap
   */
  static chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      let chunk = text.slice(startIndex, endIndex);

      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const lastPeriod = chunk.lastIndexOf('. ');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > chunkSize * 0.5) {
          chunk = chunk.slice(0, breakPoint + 1);
          startIndex += breakPoint + 1;
        } else {
          startIndex += chunkSize - overlap;
        }
      } else {
        startIndex = text.length;
      }

      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings using OpenRouter
   */
  static async generateEmbeddings(chunks: ContentChunk[]): Promise<EmbeddedChunk[]> {
    const embeddedChunks: EmbeddedChunk[] = [];

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    // Process chunks one by one (OpenRouter doesn't support batch embeddings the same way)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const response = await openaiEmbeddings.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.content,
        });

        embeddedChunks.push({
          ...chunk,
          embedding: response.data[0].embedding,
        });

        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          console.log(`Processed ${i + 1}/${chunks.length} chunks`);
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        throw error;
      }
    }

    console.log('All embeddings generated successfully!');
    return embeddedChunks;
  }

  /**
   * Create embedding for a single text using OpenAI
   */
  static async createEmbedding(text: string): Promise<number[]> {
    const response = await openaiEmbeddings.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i]!, 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find the most relevant chunks for a query
   */
  static async findRelevantChunks(
    websiteId: string,
    query: string,
    topK: number = 5
  ): Promise<Array<{ content: string; metadata: any; similarity: number }>> {
    // Generate embedding for the query
    const queryEmbedding = await this.createEmbedding(query);

    // Get all chunks for this website
    const chunks = await prisma.websiteChunk.findMany({
      where: { websiteId },
    });

    // Calculate similarity scores
    const rankedChunks = chunks.map((chunk) => {
      const chunkEmbedding = JSON.parse(chunk.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);

      return {
        content: chunk.content,
        metadata: JSON.parse(chunk.metadata),
        similarity,
      };
    });

    // Sort by similarity and return top K
    return rankedChunks.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Process website content and store embeddings
   */
  static async processWebsiteContent(
    websiteId: string,
    content: string,
    metadata: {
      url: string;
      title: string;
      author?: string;
      publishDate?: string;
      articleTitle?: string;
    },
    chunkingStrategy?: ChunkingStrategy
  ): Promise<void> {
    console.log(`Processing: ${metadata.articleTitle || metadata.title}`);

    // Split content into chunks
    const textChunks = chunkingStrategy
      ? AdaptiveChunkerService.chunkText(content, chunkingStrategy)
      : this.chunkText(content);

    console.log(`  Split into ${textChunks.length} chunks`);

    // Create chunk objects with metadata
    const chunks: ContentChunk[] = textChunks.map((text, index) => ({
      content: text,
      metadata: {
        url: metadata.url,
        title: metadata.title,
        author: metadata.author,
        publishDate: metadata.publishDate,
        articleTitle: metadata.articleTitle,
        chunkIndex: index,
      },
    }));

    // Generate embeddings
    const embeddedChunks = await this.generateEmbeddings(chunks);

    // Store in database
    console.log('Storing chunks in database...');
    await prisma.websiteChunk.createMany({
      data: embeddedChunks.map((chunk) => ({
        websiteId,
        content: chunk.content,
        embedding: JSON.stringify(chunk.embedding),
        metadata: JSON.stringify(chunk.metadata),
      })),
    });

    console.log('Website content processing completed!');
  }

  /**
   * Generate AI response using RAG with OpenAI
   */
  static async generateResponse(
    websiteId: string,
    query: string,
    chatHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    // Find relevant chunks
    const relevantChunks = await this.findRelevantChunks(websiteId, query, 5);

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk, i) => {
        const meta = chunk.metadata;
        const header = [
          meta.articleTitle || meta.title,
          meta.author ? `By ${meta.author}` : null,
          meta.publishDate ? meta.publishDate : null,
        ].filter(Boolean).join(' | ');

        return `[Article ${i + 1}: ${header}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Build messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on website content. Use the provided context to answer questions accurately and concisely.`,
      },
      ...chatHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: `Context from website:\n${context}\n\nQuestion: ${query}`,
      },
    ];

    const response = await openRouterChat.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
    });

    return response.choices[0]?.message?.content || 'No response generated';
  }
}
