import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function requireIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

async function getProfileByToken(ctx: QueryCtx, tokenIdentifier: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", tokenIdentifier))
    .unique();
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("normal"), v.literal("extraCard"))),
    regionCode: v.optional(v.string()),
    commune: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedSearch = args.search?.trim().toLowerCase() ?? "";
    const baseListings = args.regionCode && args.commune
      ? await ctx.db
          .query("marketListings")
          .withIndex("by_regionCode_and_commune", (q) => q.eq("regionCode", args.regionCode!).eq("commune", args.commune!))
          .take(100)
      : await ctx.db.query("marketListings").withIndex("by_status", (q) => q.eq("status", "active")).order("desc").take(100);
    const filteredListings = baseListings
      .filter((listing) => listing.status === "active")
      .filter((listing) => !args.kind || listing.kind === args.kind)
      .filter((listing) => {
        if (!normalizedSearch) return true;

        return `${listing.stickerId} ${listing.stickerName} ${listing.stickerSection}`.toLowerCase().includes(normalizedSearch);
      })
      .slice(0, 50);
    const results = [];

    for (const listing of filteredListings) {
      const profile = await getProfileByToken(ctx, listing.sellerTokenIdentifier);

      results.push({
        ...listing,
        sellerName: profile?.displayName ?? "Coleccionista",
        whatsapp: profile?.whatsapp ?? null,
        instagram: profile?.instagram ?? null,
      });
    }

    return results;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    return await ctx.db
      .query("marketListings")
      .withIndex("by_sellerTokenIdentifier", (q) => q.eq("sellerTokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(100);
  },
});

export const createListing = mutation({
  args: {
    stickerId: v.string(),
    stickerName: v.string(),
    stickerSection: v.string(),
    kind: v.union(v.literal("normal"), v.literal("extraCard")),
    price: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!profile) throw new Error("Completa tu perfil antes de publicar");
    if (args.price < 0) throw new Error("Precio invalido");

    const now = Date.now();

    return await ctx.db.insert("marketListings", {
      sellerTokenIdentifier: identity.tokenIdentifier,
      stickerId: args.stickerId.trim(),
      stickerName: args.stickerName.trim(),
      stickerSection: args.stickerSection.trim(),
      kind: args.kind,
      price: Math.round(args.price),
      description: args.description?.trim() || undefined,
      regionCode: profile.regionCode,
      regionName: profile.regionName,
      commune: profile.commune,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    listingId: v.id("marketListings"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("sold")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const listing = await ctx.db.get(args.listingId);

    if (!listing) throw new Error("Publicacion no encontrada");
    if (listing.sellerTokenIdentifier !== identity.tokenIdentifier) throw new Error("Unauthorized");

    await ctx.db.patch(args.listingId, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});
