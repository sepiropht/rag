-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending'
);

-- CreateTable
CREATE TABLE "website_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "websiteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "website_chunks_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "website_chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    CONSTRAINT "website_chats_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "website_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "website_chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "website_chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "website_chunks_websiteId_idx" ON "website_chunks"("websiteId");

-- CreateIndex
CREATE INDEX "website_chats_websiteId_idx" ON "website_chats"("websiteId");

-- CreateIndex
CREATE INDEX "website_chat_messages_chatId_idx" ON "website_chat_messages"("chatId");
