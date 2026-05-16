import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function requireIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    displayName: v.string(),
    regionCode: v.string(),
    regionName: v.string(),
    commune: v.string(),
    whatsapp: v.string(),
    instagram: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const displayName = args.displayName.trim();
    const whatsapp = args.whatsapp.trim();
    const instagram = args.instagram?.trim();

    if (displayName.length < 2) throw new Error("Nombre visible invalido");
    if (whatsapp.length < 8) throw new Error("WhatsApp invalido");

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    const profile = {
      ownerTokenIdentifier: identity.tokenIdentifier,
      displayName,
      regionCode: args.regionCode,
      regionName: args.regionName,
      commune: args.commune,
      whatsapp,
      instagram: instagram ? instagram.replace(/^@/, "") : undefined,
      updatedAt: Date.now(),
    };

    if (existingProfile) {
      await ctx.db.replace(existingProfile._id, profile);
      return existingProfile._id;
    }

    return await ctx.db.insert("profiles", profile);
  },
});
