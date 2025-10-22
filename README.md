# RAG Open Source

An open-source Retrieval-Augmented Generation (RAG) system that allows you to chat with any website using AI.

## Features

- **Website Scraping**: Automatically scrapes and processes website content
- **Intelligent Chunking**: Adapts chunking strategy based on website type (blog, documentation, e-commerce, etc.)
- **Vector Search**: Uses local sentence-transformers for embeddings (no API key needed!)
- **Chat Interface**: Clean, modern UI for chatting with website content
- **No Authentication**: Simple, ready-to-use setup

## Tech Stack

- **Next.js 15** - React framework
- **Prisma** - Database ORM (SQLite)
- **Transformers.js** - Local ML embeddings (all-MiniLM-L6-v2)
- **OpenRouter** - Chat completions (Llama 3.2 3B - Free tier)
- **Puppeteer** - Website scraping
- **Tailwind CSS** - Styling

## Prerequisites

- Docker & Docker Compose (for Docker setup)
- Node.js 18+ or Bun (for local development)
- OpenRouter API key - Get one free at [https://openrouter.ai/](https://openrouter.ai/)

## Quick Start (Docker)

The fastest way to try the project:

```bash
# Clone the repo
git clone <your-repo-url>
cd rag-open-source

# Set up your API key
cp .env.example .env
# Edit .env and add your OpenRouter API key from https://openrouter.ai/

# Start with Docker
docker compose up -d

# Open http://localhost:3000 in your browser
# Add a website URL and start chatting!
```

**Useful commands:**

```bash
# View logs
docker compose logs -f

# Stop the application
docker compose down

# Rebuild after changes
docker compose up -d --build
```

## Getting Started

### Option 1: Docker (Recommended)

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd rag-open-source
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your [OpenRouter API key](https://openrouter.ai/):

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

3. **Run with Docker Compose**

```bash
docker compose up -d
```

The application will be available at [http://localhost:3000](http://localhost:3000).

The database and transformer models cache are persisted in volumes, so your data will be preserved between restarts.

### Option 2: Local Development

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

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

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

For a detailed explanation of how RAG works and the technical architecture, check out the blog post: [Building an Open-Source RAG System](https://elimbi.com)

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
this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
// Or use other sentence-transformers models from Hugging Face
```

Note: Embeddings run locally using Transformers.js - no API key needed!

### Chat Model

Change the chat model in `rag.service.ts` (all OpenRouter models available):

```typescript
model: 'meta-llama/llama-3.2-3b-instruct:free'  // Free model
// Or use paid models: 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', etc.
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
