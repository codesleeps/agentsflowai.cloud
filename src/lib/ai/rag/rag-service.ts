/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles document processing, embedding generation, and semantic search
 */

import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  generateEmbeddings,
  chunkText,
  cosineSimilarity,
} from "./embeddings";

export interface ProcessDocumentOptions {
  chunkSize?: number;
  overlap?: number;
  embeddingModel?: string;
}

export interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  documentId: string;
  documentName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Process a document: chunk it and generate embeddings
 */
export async function processDocument(
  documentId: string,
  options: ProcessDocumentOptions = {}
): Promise<void> {
  const { chunkSize = 1000, overlap = 200 } = options;

  // Get document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { knowledgeBase: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Update status to processing
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "processing" },
  });

  try {
    // Chunk the content
    const chunks = chunkText(document.content, { chunkSize, overlap });

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // Store chunks with embeddings
    await prisma.$transaction(
      chunks.map((content, index) =>
        prisma.documentChunk.create({
          data: {
            documentId,
            content,
            chunkIndex: index,
            embedding: JSON.stringify(embeddings[index]),
            metadata: {
              startIndex: index * (chunkSize - overlap),
              endIndex: index * (chunkSize - overlap) + content.length,
            },
          },
        })
      )
    );

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "completed" },
    });
  } catch (error) {
    // Update document status to error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Search for relevant chunks in a knowledge base
 */
export async function searchKnowledgeBase(
  knowledgeBaseId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { topK = 5, minSimilarity = 0.7 } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Get all chunks from the knowledge base
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        knowledgeBaseId,
        status: "completed",
      },
    },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          metadata: true,
        },
      },
    },
  });

  // Calculate similarity for each chunk
  const scoredChunks = chunks
    .map((chunk) => {
      const embedding = JSON.parse(chunk.embedding || "[]") as number[];
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return {
        chunkId: chunk.id,
        content: chunk.content,
        similarity,
        documentId: chunk.document.id,
        documentName: chunk.document.name,
        metadata: chunk.metadata as Record<string, unknown> | undefined,
      };
    })
    .filter((chunk) => chunk.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scoredChunks;
}

/**
 * Generate a RAG-enhanced response
 */
export async function generateRAGResponse(
  knowledgeBaseId: string,
  query: string,
  generateFn: (context: string, query: string) => Promise<string>
): Promise<{
  response: string;
  sources: SearchResult[];
  latencyMs: number;
}> {
  const startTime = Date.now();

  // Search for relevant context
  const sources = await searchKnowledgeBase(knowledgeBaseId, query, {
    topK: 5,
    minSimilarity: 0.6,
  });

  // Build context from sources
  const context = sources
    .map((s, i) => `[${i + 1}] From "${s.documentName}":\n${s.content}`)
    .join("\n\n");

  // Generate response with context
  const response = await generateFn(context, query);

  const latencyMs = Date.now() - startTime;

  // Log query for analytics
  await prisma.rAGQuery.create({
    data: {
      userId: "system", // Should be passed in from auth context
      knowledgeBaseId,
      query,
      response,
      retrievedChunks: sources as unknown as Record<string, unknown>,
      latencyMs,
    },
  });

  return { response, sources, latencyMs };
}

/**
 * Create a knowledge base
 */
export async function createKnowledgeBase(
  userId: string,
  name: string,
  description?: string
) {
  return prisma.knowledgeBase.create({
    data: {
      userId,
      name,
      description,
    },
  });
}

/**
 * Add a document to a knowledge base
 */
export async function addDocument(
  knowledgeBaseId: string,
  name: string,
  content: string,
  fileType: string,
  fileSize: number,
  mimeType: string,
  metadata?: Record<string, unknown>
) {
  return prisma.document.create({
    data: {
      knowledgeBaseId,
      name,
      content,
      fileType,
      fileSize,
      mimeType,
      metadata: metadata as Record<string, unknown>,
    },
  });
}

/**
 * Delete a knowledge base and all its documents
 */
export async function deleteKnowledgeBase(knowledgeBaseId: string) {
  return prisma.knowledgeBase.delete({
    where: { id: knowledgeBaseId },
  });
}

/**
 * Get knowledge base with document count
 */
export async function getKnowledgeBaseWithStats(knowledgeBaseId: string) {
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
    include: {
      documents: {
        select: {
          id: true,
          name: true,
          status: true,
          fileType: true,
          createdAt: true,
          _count: {
            select: { chunks: true },
          },
        },
      },
    },
  });

  if (!kb) return null;

  const totalChunks = kb.documents.reduce(
    (sum, doc) => sum + doc._count.chunks,
    0
  );

  return {
    ...kb,
    totalChunks,
  };
}

/**
 * Get all knowledge bases for a user
 */
export async function getUserKnowledgeBases(userId: string) {
  return prisma.knowledgeBase.findMany({
    where: { userId },
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
