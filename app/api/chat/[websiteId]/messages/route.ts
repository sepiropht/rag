import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RAGService } from '@/lib/services/rag.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { websiteId: string } }
) {
  try {
    // Get or create default chat for this website
    let chat = await prisma.websiteChat.findFirst({
      where: { websiteId: params.websiteId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      chat = await prisma.websiteChat.create({
        data: {
          websiteId: params.websiteId,
          title: 'Default Chat',
        },
        include: {
          messages: true,
        },
      });
    }

    return NextResponse.json(chat.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { websiteId: string } }
) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if website exists and is completed
    const website = await prisma.website.findUnique({
      where: { id: params.websiteId },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (website.status !== 'completed') {
      return NextResponse.json(
        { error: 'Website is not ready yet' },
        { status: 400 }
      );
    }

    // Get or create default chat
    let chat = await prisma.websiteChat.findFirst({
      where: { websiteId: params.websiteId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      chat = await prisma.websiteChat.create({
        data: {
          websiteId: params.websiteId,
          title: 'Default Chat',
        },
        include: {
          messages: true,
        },
      });
    }

    // Save user message
    await prisma.websiteChatMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // Get chat history for context
    const chatHistory = chat.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Generate AI response using RAG
    const aiResponse = await RAGService.generateResponse(
      params.websiteId,
      message,
      chatHistory
    );

    // Save assistant message
    await prisma.websiteChatMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
