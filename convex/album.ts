import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function requireIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const stickers = await ctx.db
      .query("userStickers")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .take(1200);
    const preferences = await ctx.db
      .query("albumPreferences")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();

    return {
      owned: stickers.filter((sticker) => sticker.isOwned).map((sticker) => sticker.stickerId),
      duplicates: stickers.filter((sticker) => sticker.isDuplicate).map((sticker) => sticker.stickerId),
      duplicateQuantities: Object.fromEntries(
        stickers
          .filter((sticker) => sticker.isDuplicate)
          .map((sticker) => [sticker.stickerId, Math.max(1, Math.floor(sticker.duplicateQuantity ?? 1))]),
      ),
      wanted: stickers.filter((sticker) => sticker.isWanted).map((sticker) => sticker.stickerId),
      wantedMode: preferences?.wantedMode ?? "allMissing",
    };
  },
});

export const setSticker = mutation({
  args: {
    stickerId: v.string(),
    isOwned: v.boolean(),
    isDuplicate: v.boolean(),
    duplicateQuantity: v.optional(v.number()),
    isWanted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const isDuplicate = args.isOwned && args.isDuplicate;
    const duplicateQuantity = isDuplicate ? Math.max(1, Math.floor(args.duplicateQuantity ?? 1)) : undefined;
    const isWanted = !args.isOwned && args.isWanted;
    const existingSticker = await ctx.db
      .query("userStickers")
      .withIndex("by_ownerTokenIdentifier_and_stickerId", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("stickerId", args.stickerId),
      )
      .unique();

    if (!args.isOwned && !isDuplicate && !isWanted) {
      if (existingSticker) await ctx.db.delete(existingSticker._id);
      return null;
    }

    const stickerState = {
      ownerTokenIdentifier: identity.tokenIdentifier,
      stickerId: args.stickerId,
      isOwned: args.isOwned,
      isDuplicate,
      duplicateQuantity,
      isWanted,
      updatedAt: Date.now(),
    };

    if (existingSticker) {
      await ctx.db.replace(existingSticker._id, stickerState);
      return existingSticker._id;
    }

    return await ctx.db.insert("userStickers", stickerState);
  },
});

export const setWantedMode = mutation({
  args: {
    wantedMode: v.union(v.literal("allMissing"), v.literal("specific")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existingPreferences = await ctx.db
      .query("albumPreferences")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    const preferences = {
      ownerTokenIdentifier: identity.tokenIdentifier,
      wantedMode: args.wantedMode,
      updatedAt: Date.now(),
    };

    if (existingPreferences) {
      await ctx.db.replace(existingPreferences._id, preferences);
      return existingPreferences._id;
    }

    return await ctx.db.insert("albumPreferences", preferences);
  },
});

export const saveSnapshot = mutation({
  args: {
    owned: v.array(v.string()),
    duplicates: v.array(v.string()),
    duplicateQuantities: v.optional(v.record(v.string(), v.number())),
    wanted: v.array(v.string()),
    wantedMode: v.union(v.literal("allMissing"), v.literal("specific")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const owned = new Set(args.owned);
    const duplicates = new Set(args.duplicates.filter((stickerId) => owned.has(stickerId)));
    const duplicateQuantities = args.duplicateQuantities ?? {};
    const wanted = new Set(args.wanted.filter((stickerId) => !owned.has(stickerId)));
    const stickerIds = new Set([...owned, ...duplicates, ...wanted]);
    const existingStickers = await ctx.db
      .query("userStickers")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .take(1200);
    const existingByStickerId = new Map(existingStickers.map((sticker) => [sticker.stickerId, sticker]));

    for (const stickerId of stickerIds) {
      const stickerState = {
        ownerTokenIdentifier: identity.tokenIdentifier,
        stickerId,
        isOwned: owned.has(stickerId),
        isDuplicate: duplicates.has(stickerId),
        duplicateQuantity: duplicates.has(stickerId) ? Math.max(1, Math.floor(duplicateQuantities[stickerId] ?? 1)) : undefined,
        isWanted: wanted.has(stickerId),
        updatedAt: now,
      };
      const existingSticker = existingByStickerId.get(stickerId);

      if (existingSticker) {
        await ctx.db.replace(existingSticker._id, stickerState);
      } else {
        await ctx.db.insert("userStickers", stickerState);
      }
    }

    const existingPreferences = await ctx.db
      .query("albumPreferences")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    const preferences = {
      ownerTokenIdentifier: identity.tokenIdentifier,
      wantedMode: args.wantedMode,
      updatedAt: now,
    };

    if (existingPreferences) {
      await ctx.db.replace(existingPreferences._id, preferences);
    } else {
      await ctx.db.insert("albumPreferences", preferences);
    }

    return null;
  },
});
