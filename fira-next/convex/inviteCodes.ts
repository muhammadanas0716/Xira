import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all invite codes (admin only)
export const getAllInviteCodes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return [];

    return await ctx.db
      .query("inviteCodes")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// Create new invite code (admin only)
export const createInviteCode = mutation({
  args: {
    maxUses: v.optional(v.number()),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) throw new Error("Not authorized");

    // Generate unique code
    let code = generateInviteCode();
    let existingCode = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    while (existingCode) {
      code = generateInviteCode();
      existingCode = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("inviteCodes", {
      code,
      createdById: user._id,
      maxUses: args.maxUses || 10,
      usesCount: 0,
      isActive: true,
      expiresAt,
      createdAt: Date.now(),
    });

    return code;
  },
});

// Toggle invite code active status (admin only)
export const toggleInviteCode = mutation({
  args: { codeId: v.id("inviteCodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) throw new Error("Not authorized");

    const code = await ctx.db.get(args.codeId);
    if (!code) throw new Error("Invite code not found");

    await ctx.db.patch(args.codeId, {
      isActive: !code.isActive,
    });

    return { success: true };
  },
});

// Delete invite code (admin only)
export const deleteInviteCode = mutation({
  args: { codeId: v.id("inviteCodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) throw new Error("Not authorized");

    await ctx.db.delete(args.codeId);
    return { success: true };
  },
});

// Get invite code stats (admin only)
export const getInviteCodeStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.isAdmin) return null;

    const allCodes = await ctx.db.query("inviteCodes").collect();
    const activeCodes = allCodes.filter((c) => c.isActive);
    const totalUses = allCodes.reduce((sum, c) => sum + c.usesCount, 0);

    return {
      total: allCodes.length,
      active: activeCodes.length,
      totalUses,
    };
  },
});
