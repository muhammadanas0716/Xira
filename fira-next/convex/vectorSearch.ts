import { query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Search chunks using vector similarity
export const searchChunks = query({
  args: {
    query: v.string(),
    filingId: v.id("filings"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, return text-based search results
    // In production, this would use Convex vector search with embeddings
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_filing", (q) => q.eq("filingId", args.filingId))
      .take(args.limit || 5);

    return chunks;
  },
});

// Vector search using embeddings (production implementation)
export const vectorSearch = action({
  args: {
    query: v.string(),
    filingId: v.id("filings"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query);

    // Perform vector search
    const results = await ctx.vectorSearch("chunks", "by_embedding", {
      vector: embedding,
      limit: args.limit || 5,
      filter: (q) => q.eq("filingId", args.filingId),
    });

    // Fetch full chunk data
    const chunks = await Promise.all(
      results.map(async (result) => {
        const chunk = await ctx.runQuery(internal.vectorSearch.getChunk, {
          chunkId: result._id,
        });
        return {
          ...chunk,
          score: result._score,
        };
      })
    );

    return chunks.filter(Boolean);
  },
});

// Internal query to get chunk by ID
export const getChunk = query({
  args: { chunkId: v.id("chunks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

// Generate embedding using Voyage AI or OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (voyageApiKey) {
    // Use Voyage AI for embeddings
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageApiKey}`,
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: text,
        input_type: "query",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate Voyage embedding");
    }

    const data = await response.json();
    return data.data[0].embedding;
  } else if (openaiApiKey) {
    // Fallback to OpenAI embeddings
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate OpenAI embedding");
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  throw new Error("No embedding API key configured");
}

// Store a chunk with embedding
export const storeChunk = internalMutation({
  args: {
    filingId: v.id("filings"),
    ticker: v.string(),
    section: v.string(),
    chunkIndex: v.number(),
    text: v.string(),
    metadata: v.object({
      formType: v.string(),
      fiscalYear: v.number(),
      fiscalQuarter: v.optional(v.number()),
      filingDate: v.string(),
      accessionNumber: v.string(),
    }),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chunks", {
      filingId: args.filingId,
      ticker: args.ticker,
      section: args.section,
      chunkIndex: args.chunkIndex,
      text: args.text,
      metadata: args.metadata,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
  },
});

// Get chunks by filing
export const getChunksByFiling = query({
  args: { filingId: v.id("filings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chunks")
      .withIndex("by_filing", (q) => q.eq("filingId", args.filingId))
      .collect();
  },
});

// Delete all chunks for a filing
export const deleteChunksByFiling = internalMutation({
  args: { filingId: v.id("filings") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_filing", (q) => q.eq("filingId", args.filingId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    return { deleted: chunks.length };
  },
});
