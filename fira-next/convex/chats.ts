import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all chats for current user
export const getUserChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("chats")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

// Get single chat by ID
export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) return null;

    // Get filing info
    const filing = await ctx.db.get(chat.filingId);

    return {
      ...chat,
      filing,
    };
  },
});

// Create new chat
export const createChat = mutation({
  args: {
    filingId: v.id("filings"),
    ticker: v.string(),
    stockInfo: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");
    if (!user.isActive) throw new Error("Account is deactivated");

    const chatId = await ctx.db.insert("chats", {
      userId: user._id,
      filingId: args.filingId,
      ticker: args.ticker,
      stockInfo: args.stockInfo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return chatId;
  },
});

// Update chat with generated report
export const updateChatReport = mutation({
  args: {
    chatId: v.id("chats"),
    generatedReport: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(args.chatId, {
      generatedReport: args.generatedReport,
      reportGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete chat
export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error("Chat not found");
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.chatId);

    return { success: true };
  },
});

// Get chat count for admin dashboard
export const getChatStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return null;

    const allChats = await ctx.db.query("chats").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chatsToday = allChats.filter(
      (chat) => chat.createdAt >= today.getTime()
    ).length;

    return {
      total: allChats.length,
      today: chatsToday,
    };
  },
});
