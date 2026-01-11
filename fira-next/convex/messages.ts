import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get messages for a chat
export const getChatMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Create a new message (question only, answer is streamed)
export const createMessage = mutation({
  args: {
    chatId: v.id("chats"),
    question: v.string(),
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

    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error("Chat not found");
    }

    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      question: args.question,
      answer: "",
      isStreaming: true,
      createdAt: Date.now(),
    });

    // Update chat timestamp
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

// Update message with streamed answer
export const updateMessageAnswer = mutation({
  args: {
    messageId: v.id("messages"),
    answer: v.string(),
    isStreaming: v.optional(v.boolean()),
    retrievedChunkIds: v.optional(v.array(v.id("chunks"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify user owns the chat
    const chat = await ctx.db.get(message.chatId);
    if (!chat) throw new Error("Chat not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || chat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.messageId, {
      answer: args.answer,
      isStreaming: args.isStreaming ?? false,
      retrievedChunkIds: args.retrievedChunkIds,
    });
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const chat = await ctx.db.get(message.chatId);
    if (!chat) throw new Error("Chat not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || chat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

// Get message count for admin
export const getMessageStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return null;

    const allMessages = await ctx.db.query("messages").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messagesToday = allMessages.filter(
      (msg) => msg.createdAt >= today.getTime()
    ).length;

    return {
      total: allMessages.length,
      today: messagesToday,
    };
  },
});
