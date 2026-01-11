import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table (synced with Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    isAdmin: v.boolean(),
    inviteCodeId: v.optional(v.id("inviteCodes")),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),

  // Invite codes for registration
  inviteCodes: defineTable({
    code: v.string(),
    createdById: v.optional(v.id("users")),
    maxUses: v.number(),
    usesCount: v.number(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_created_at", ["createdAt"]),

  // SEC Filings metadata
  filings: defineTable({
    ticker: v.string(),
    formType: v.string(),
    fiscalYear: v.number(),
    fiscalQuarter: v.optional(v.number()),
    filingDate: v.number(),
    periodEndDate: v.optional(v.number()),
    accessionNumber: v.string(),
    filingUrl: v.optional(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
    totalChunks: v.number(),
    isEmbedded: v.boolean(),
    embeddedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_accession", ["accessionNumber"])
    .index("by_ticker_date", ["ticker", "filingDate"])
    .index("by_embedded", ["isEmbedded"]),

  // Document chunks with embeddings
  chunks: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_filing", ["filingId"])
    .index("by_ticker", ["ticker"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
      filterFields: ["ticker", "filingId"],
    }),

  // Chat sessions
  chats: defineTable({
    userId: v.id("users"),
    filingId: v.id("filings"),
    ticker: v.string(),
    stockInfo: v.optional(v.any()),
    generatedReport: v.optional(v.string()),
    reportGeneratedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_filing", ["filingId"])
    .index("by_ticker", ["ticker"]),

  // Chat messages
  messages: defineTable({
    chatId: v.id("chats"),
    question: v.string(),
    answer: v.string(),
    retrievedChunkIds: v.optional(v.array(v.id("chunks"))),
    isStreaming: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_created", ["chatId", "createdAt"]),

  // Waitlist emails
  waitlistEmails: defineTable({
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // Background jobs
  jobs: defineTable({
    type: v.union(
      v.literal("embed_filing"),
      v.literal("generate_report"),
      v.literal("refresh_stock_data")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    targetId: v.string(),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_type_status", ["type", "status"])
    .index("by_target", ["targetId"]),
});
