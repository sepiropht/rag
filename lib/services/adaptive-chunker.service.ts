import { ChunkingStrategy } from './site-detector.service';

export class AdaptiveChunkerService {
  /**
   * Chunk text adaptively based on site-specific strategy
   */
  static chunkText(
    text: string,
    strategy: ChunkingStrategy
  ): string[] {
    const { preferredSize, overlap, respectBoundaries } = strategy;

    switch (respectBoundaries) {
      case 'page':
        // Don't chunk - keep entire page as one chunk
        return [text];

      case 'section':
        return this.chunkBySections(text, preferredSize, overlap);

      case 'heading':
        return this.chunkByHeadings(text, preferredSize, overlap);

      case 'paragraph':
      default:
        return this.chunkByParagraphs(text, preferredSize, overlap);
    }
  }

  /**
   * Chunk by paragraphs (default strategy)
   */
  private static chunkByParagraphs(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
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
   * Chunk by sections (for documentation)
   */
  private static chunkBySections(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
    // Split by double newlines (section separators)
    const sections = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
      // If adding this section would exceed chunk size
      if (currentChunk.length + section.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approx overlap
        currentChunk = overlapWords.join(' ') + '\n\n' + section;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Chunk by headings (for structured content)
   */
  private static chunkByHeadings(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
    // Split by headings (# or ## for markdown, or detect ALL CAPS lines)
    const headingRegex = /^(#{1,6}\s+.+|[A-Z][A-Z\s]{10,})$/gm;
    const chunks: string[] = [];
    let currentChunk = '';
    let lastHeading = '';

    const lines = text.split('\n');

    for (const line of lines) {
      const isHeading = headingRegex.test(line);

      if (isHeading && currentChunk.length > chunkSize * 0.3) {
        // Save current chunk
        chunks.push(currentChunk.trim());

        // Start new chunk with heading
        currentChunk = line;
        lastHeading = line;
      } else {
        currentChunk += '\n' + line;
      }

      // If chunk is too large, force split
      if (currentChunk.length > chunkSize * 1.5) {
        chunks.push(currentChunk.trim());
        currentChunk = lastHeading; // Start next chunk with last heading
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }
}
