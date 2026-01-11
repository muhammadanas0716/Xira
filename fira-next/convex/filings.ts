import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Ensure filing exists or create it
export const ensureFiling = mutation({
  args: {
    ticker: v.string(),
    formType: v.string(),
    filingDate: v.string(),
    accessionNumber: v.string(),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if filing already exists
    const existingFiling = await ctx.db
      .query("filings")
      .withIndex("by_accession", (q) =>
        q.eq("accessionNumber", args.accessionNumber)
      )
      .first();

    if (existingFiling) {
      return existingFiling._id;
    }

    // Parse fiscal info from filing date
    const filingDateObj = new Date(args.filingDate);
    const fiscalYear = filingDateObj.getFullYear();
    let fiscalQuarter: number | undefined;

    if (args.formType === "10-Q") {
      const month = filingDateObj.getMonth();
      if (month >= 0 && month <= 2) fiscalQuarter = 4; // Q4 of previous year
      else if (month >= 3 && month <= 5) fiscalQuarter = 1;
      else if (month >= 6 && month <= 8) fiscalQuarter = 2;
      else fiscalQuarter = 3;
    }

    // Create new filing
    const filingId = await ctx.db.insert("filings", {
      ticker: args.ticker.toUpperCase(),
      formType: args.formType,
      fiscalYear,
      fiscalQuarter,
      filingDate: filingDateObj.getTime(),
      accessionNumber: args.accessionNumber,
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${args.accessionNumber.replace(/-/g, "/")}`,
      totalChunks: 0,
      isEmbedded: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return filingId;
  },
});

// Get filing by ID
export const getFiling = query({
  args: { filingId: v.id("filings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.filingId);
  },
});

// Get filings by ticker
export const getFilingsByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("filings")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .order("desc")
      .collect();
  },
});

// Update filing embedding status
export const updateFilingEmbedding = mutation({
  args: {
    filingId: v.id("filings"),
    isEmbedded: v.boolean(),
    totalChunks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.filingId, {
      isEmbedded: args.isEmbedded,
      totalChunks: args.totalChunks,
      embeddedAt: args.isEmbedded ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

// Get all filings (for admin)
export const getAllFilings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return [];

    return await ctx.db.query("filings").order("desc").take(100);
  },
});

// Get filing stats (for admin dashboard)
export const getFilingStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return null;

    const allFilings = await ctx.db.query("filings").collect();
    const embeddedFilings = allFilings.filter((f) => f.isEmbedded);

    return {
      total: allFilings.length,
      embedded: embeddedFilings.length,
      pending: allFilings.length - embeddedFilings.length,
    };
  },
});
