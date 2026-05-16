import { v } from "convex/values";
import { query } from "./_generated/server";

function includesWanted(stickerId: string, wantedMode: "allMissing" | "specific", owned: Set<string>, wanted: Set<string>) {
  return wantedMode === "allMissing" ? !owned.has(stickerId) : wanted.has(stickerId);
}

export const list = query({
  args: {
    scope: v.union(v.literal("short"), v.literal("medium"), v.literal("long")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentProfile) return [];

    const currentStickers = await ctx.db
      .query("userStickers")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .take(1200);
    const currentPreferences = await ctx.db
      .query("albumPreferences")
      .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    const currentOwned = new Set(currentStickers.filter((sticker) => sticker.isOwned).map((sticker) => sticker.stickerId));
    const currentDuplicates = currentStickers.filter((sticker) => sticker.isDuplicate).map((sticker) => sticker.stickerId);
    const currentWanted = new Set(currentStickers.filter((sticker) => sticker.isWanted).map((sticker) => sticker.stickerId));
    const currentWantedMode = currentPreferences?.wantedMode ?? "allMissing";
    const profiles =
      args.scope === "short"
        ? await ctx.db
            .query("profiles")
            .withIndex("by_regionCode_and_commune", (q) => q.eq("regionCode", currentProfile.regionCode).eq("commune", currentProfile.commune))
            .take(50)
        : args.scope === "medium"
          ? await ctx.db
              .query("profiles")
              .withIndex("by_regionCode", (q) => q.eq("regionCode", currentProfile.regionCode))
              .take(50)
          : await ctx.db.query("profiles").take(50);
    const matches = [];

    for (const profile of profiles) {
      if (profile.ownerTokenIdentifier === identity.tokenIdentifier) continue;

      const otherStickers = await ctx.db
        .query("userStickers")
        .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", profile.ownerTokenIdentifier))
        .take(1200);
      const otherPreferences = await ctx.db
        .query("albumPreferences")
        .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", profile.ownerTokenIdentifier))
        .unique();
      const otherOwned = new Set(otherStickers.filter((sticker) => sticker.isOwned).map((sticker) => sticker.stickerId));
      const otherDuplicates = otherStickers.filter((sticker) => sticker.isDuplicate).map((sticker) => sticker.stickerId);
      const otherWanted = new Set(otherStickers.filter((sticker) => sticker.isWanted).map((sticker) => sticker.stickerId));
      const otherWantedMode = otherPreferences?.wantedMode ?? "allMissing";
      const offers = otherDuplicates.filter((stickerId) => includesWanted(stickerId, currentWantedMode, currentOwned, currentWanted)).slice(0, 8);
      const receives = currentDuplicates.filter((stickerId) => includesWanted(stickerId, otherWantedMode, otherOwned, otherWanted)).slice(0, 8);

      if (offers.length === 0 || receives.length === 0) continue;

      matches.push({
        id: profile._id,
        collector: profile.displayName,
        location: `${profile.commune}, ${profile.regionName}`,
        compatibility: Math.min(offers.length, receives.length),
        offers,
        receives,
        whatsapp: profile.whatsapp,
        instagram: profile.instagram ?? null,
        featured: false,
      });
    }

    return matches.sort((a, b) => b.compatibility - a.compatibility).slice(0, 20);
  },
});
