import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function requireIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 9 && digits.startsWith("9")) return `+56${digits}`;
  if (digits.length === 11 && digits.startsWith("56")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("056")) return `+${digits.slice(1)}`;

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function normalizeInstagram(value: string | undefined) {
  const cleaned = value
    ?.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\?.*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();

  if (!cleaned) return undefined;

  return cleaned.replace(/[^a-z0-9._]/g, "");
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
    const whatsapp = normalizeWhatsapp(args.whatsapp);
    const instagram = normalizeInstagram(args.instagram);

    if (displayName.length < 2) throw new Error("Nombre visible invalido");
    if (!/^\+569\d{8}$/.test(whatsapp)) throw new Error("WhatsApp invalido");

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
      instagram,
      updatedAt: Date.now(),
    };

    if (existingProfile) {
      await ctx.db.replace(existingProfile._id, profile);
      return existingProfile._id;
    }

    return await ctx.db.insert("profiles", profile);
  },
});
