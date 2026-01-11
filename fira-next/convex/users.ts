import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update user from Clerk webhook
export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        lastLogin: Date.now(),
      });
      return existingUser._id;
    }

    // New user - create with default values
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      isActive: true,
      isAdmin: false,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user by Clerk ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get current user (called with identity from Clerk)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

// Validate invite code for registration
export const validateInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const inviteCode = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!inviteCode) return { valid: false, error: "Invalid invite code" };
    if (!inviteCode.isActive) return { valid: false, error: "Invite code is inactive" };
    if (inviteCode.usesCount >= inviteCode.maxUses) return { valid: false, error: "Invite code has reached maximum uses" };
    if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) return { valid: false, error: "Invite code has expired" };

    return { valid: true };
  },
});

// Use invite code during registration
export const useInviteCode = mutation({
  args: {
    code: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteCode = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!inviteCode || !inviteCode.isActive) {
      throw new Error("Invalid invite code");
    }

    if (inviteCode.usesCount >= inviteCode.maxUses) {
      throw new Error("Invite code has reached maximum uses");
    }

    // Update invite code usage
    await ctx.db.patch(inviteCode._id, {
      usesCount: inviteCode.usesCount + 1,
    });

    // Update user with invite code reference
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        inviteCodeId: inviteCode._id,
      });
    }

    return { success: true };
  },
});

// Admin: Get all users
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser?.isAdmin) return [];

    return await ctx.db
      .query("users")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// Admin: Toggle user active status
export const toggleUserActive = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser?.isAdmin) throw new Error("Not authorized");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
    });

    return { success: true };
  },
});

// Admin: Make user admin
export const toggleUserAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser?.isAdmin) throw new Error("Not authorized");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      isAdmin: !user.isAdmin,
    });

    return { success: true };
  },
});
