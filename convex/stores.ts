import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    regionCode: v.optional(v.string()),
    commune: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.regionCode && args.commune) {
      const communeStores = await ctx.db
        .query("stores")
        .withIndex("by_regionCode_and_commune", (q) => q.eq("regionCode", args.regionCode!).eq("commune", args.commune!))
        .take(25);
      const regionStores = await ctx.db
        .query("stores")
        .withIndex("by_regionCode", (q) => q.eq("regionCode", args.regionCode!))
        .take(50);
      const communeStoreIds = new Set(communeStores.map((store) => store._id));

      return [
        ...communeStores.filter((store) => store.isActive),
        ...regionStores.filter((store) => store.isActive && !communeStoreIds.has(store._id)),
      ].slice(0, 50);
    }

    const stores = await ctx.db.query("stores").withIndex("by_isActive", (q) => q.eq("isActive", true)).take(50);

    return stores.filter((store) => store.isActive);
  },
});
