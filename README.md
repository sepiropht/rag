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

## Getting Started

### Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/sepiropht/rag.git
cd rag

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

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/sepiropht/rag.git
cd rag
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

## License

MIT License - feel free to use this project for any purpose.
