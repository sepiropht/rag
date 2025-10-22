# RAG Open Source

An open-source Retrieval-Augmented Generation (RAG) system that allows you to chat with any website using AI.

## Features

- **Website Scraping**: Automatically scrapes and processes website content
- **Intelligent Chunking**: Adapts chunking strategy based on website type (blog, documentation, e-commerce, etc.)
- **Vector Search**: Uses OpenRouter with OpenAI embeddings for semantic search
- **Chat Interface**: Clean, modern UI for chatting with website content
- **No Authentication**: Simple, ready-to-use setup

## Tech Stack

- **Next.js 15** - React framework
- **Prisma** - Database ORM (SQLite)
- **OpenRouter** - API gateway for AI models (OpenAI embeddings + Claude 3.5 Sonnet)
- **Puppeteer** - Website scraping
- **Tailwind CSS** - Styling

## Prerequisites

- Node.js 18+ or Bun
- OpenRouter API key (get one at https://openrouter.ai/)

## Getting Started

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd rag-open-source
```

2. **Install dependencies**

```bash
bun install
# or
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
DATABASE_URL="file:./dev.db"
```

4. **Set up the database**

```bash
bunx prisma generate
bunx prisma migrate dev --name init
```

5. **Run the development server**

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Add a Website**: Enter any website URL on the home page
2. **Processing**: The system scrapes the website, detects its type, and creates embeddings
3. **Chat**: Once processing is complete, click on the website card to start chatting
4. **Ask Questions**: Ask questions about the website content and get AI-powered answers

## Architecture

### Website Processing Pipeline

1. **Scraping** (`scraper.service.ts`):
   - Finds sitemap or crawls pages
   - Extracts content using Puppeteer and Cheerio

2. **Site Detection** (`site-detector.service.ts`):
   - Detects website type (blog, docs, e-commerce, etc.)
   - Determines optimal chunking strategy

3. **Chunking** (`adaptive-chunker.service.ts`):
   - Splits content into chunks based on site type
   - Respects semantic boundaries (paragraphs, sections, headings)

4. **Embedding** (`rag.service.ts`):
   - Generates embeddings using OpenAI's `text-embedding-3-small`
   - Stores in database for fast retrieval

### Chat Pipeline

1. **Query**: User asks a question
2. **Retrieval**: System finds most relevant chunks using cosine similarity
3. **Generation**: OpenAI GPT-4o-mini generates answer based on context
4. **Response**: Answer is displayed in the chat interface

## Project Structure

```
rag-open-source/
├── app/
│   ├── api/
│   │   ├── websites/       # Website management API
│   │   └── chat/           # Chat API
│   ├── chat/[id]/         # Chat page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/
│   ├── services/
│   │   ├── scraper.service.ts      # Website scraping
│   │   ├── site-detector.service.ts # Site type detection
│   │   ├── adaptive-chunker.service.ts # Content chunking
│   │   └── rag.service.ts          # RAG logic
│   └── prisma.ts          # Prisma client
├── prisma/
│   └── schema.prisma      # Database schema
└── README.md
```

## Database Schema

- **Website**: Stores website metadata and processing status
- **WebsiteChunk**: Content chunks with embeddings
- **WebsiteChat**: Chat sessions
- **WebsiteChatMessage**: Individual messages

## Customization

### Chunking Strategy

Modify chunking parameters in `site-detector.service.ts`:

```typescript
preferredSize: 1000,  // Target chunk size
overlap: 200,         // Overlap between chunks
respectBoundaries: 'paragraph' | 'section' | 'heading' | 'page'
```

### Embedding Model

Change the embedding model in `rag.service.ts`:

```typescript
model: 'openai/text-embedding-3-small'  // Or 'openai/text-embedding-3-large'
```

### Chat Model

Change the chat model in `rag.service.ts` (all OpenRouter models available):

```typescript
model: 'anthropic/claude-3.5-sonnet'  // Or 'openai/gpt-4o', 'google/gemini-pro', etc.
```

## Limitations

- SQLite database (for production, consider PostgreSQL)
- Single chat per website
- No user authentication
- Limited to 10 pages per website by default

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for any purpose.

## Acknowledgments

- Built with Next.js and OpenAI
- Inspired by the need for simple, open-source RAG solutions

---

**Note**: This is a demonstration project. For production use, consider:
- Adding user authentication
- Using a production database (PostgreSQL)
- Implementing rate limiting
- Adding error handling and logging
- Scaling the scraping process
- Adding tests
