import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function requireIdentity(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function includesWanted(stickerId: string, wantedMode: "allMissing" | "specific", owned: Set<string>, wanted: Set<string>) {
  return wantedMode === "allMissing" ? !owned.has(stickerId) : wanted.has(stickerId);
}

async function getProfileByToken(ctx: QueryCtx, tokenIdentifier: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", tokenIdentifier))
    .unique();
}

async function getExchangeMatches(ctx: QueryCtx, currentTokenIdentifier: string, candidateProfiles: Doc<"profiles">[]) {
  const currentStickers = await ctx.db
    .query("userStickers")
    .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", currentTokenIdentifier))
    .take(1200);
  const currentPreferences = await ctx.db
    .query("albumPreferences")
    .withIndex("by_ownerTokenIdentifier", (q) => q.eq("ownerTokenIdentifier", currentTokenIdentifier))
    .unique();
  const currentOwned = new Set(currentStickers.filter((sticker) => sticker.isOwned).map((sticker) => sticker.stickerId));
  const currentDuplicates = currentStickers.filter((sticker) => sticker.isDuplicate).map((sticker) => sticker.stickerId);
  const currentWanted = new Set(currentStickers.filter((sticker) => sticker.isWanted).map((sticker) => sticker.stickerId));
  const currentWantedMode = currentPreferences?.wantedMode ?? "allMissing";
  const matches = [];

  for (const profile of candidateProfiles) {
    if (profile.ownerTokenIdentifier === currentTokenIdentifier) continue;

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
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const name = args.name.trim();
    const description = args.description?.trim();

    if (name.length < 3) throw new Error("Nombre de grupo invalido");

    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const existing = await ctx.db.query("groups").withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode)).unique();
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    const now = Date.now();
    const groupId = await ctx.db.insert("groups", {
      name,
      description: description || undefined,
      visibility: "private",
      inviteCode,
      createdByTokenIdentifier: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      memberTokenIdentifier: identity.tokenIdentifier,
      role: "owner",
      joinedAt: now,
    });

    return groupId;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_memberTokenIdentifier", (q) => q.eq("memberTokenIdentifier", identity.tokenIdentifier))
      .take(100);
    const groups = [];

    for (const membership of memberships) {
      const group = await ctx.db.get(membership.groupId);
      if (!group) continue;

      groups.push({ ...group, role: membership.role });
    }

    return groups;
  },
});

export const joinByCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode.trim().toUpperCase()))
      .unique();

    if (!group) throw new Error("Codigo invalido");

    return await joinGroup(ctx, group._id, identity.tokenIdentifier);
  },
});

async function joinGroup(ctx: MutationCtx, groupId: Id<"groups">, tokenIdentifier: string) {
  const existingMembership = await ctx.db
    .query("groupMembers")
    .withIndex("by_groupId_and_memberTokenIdentifier", (q) => q.eq("groupId", groupId).eq("memberTokenIdentifier", tokenIdentifier))
    .unique();

  if (existingMembership) return existingMembership._id;

  return await ctx.db.insert("groupMembers", {
    groupId,
    memberTokenIdentifier: tokenIdentifier,
    role: "member",
    joinedAt: Date.now(),
  });
}

export const detail = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_memberTokenIdentifier", (q) => q.eq("groupId", args.groupId).eq("memberTokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!membership) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.groupId);
    const members = await ctx.db.query("groupMembers").withIndex("by_groupId", (q) => q.eq("groupId", args.groupId)).take(100);
    const memberProfiles = [];

    for (const member of members) {
      const profile = await getProfileByToken(ctx, member.memberTokenIdentifier);
      if (profile) memberProfiles.push({ ...profile, role: member.role });
    }

    return { group, members: memberProfiles, role: membership.role };
  },
});

export const matches = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_memberTokenIdentifier", (q) => q.eq("groupId", args.groupId).eq("memberTokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!membership) throw new Error("Unauthorized");

    const members = await ctx.db.query("groupMembers").withIndex("by_groupId", (q) => q.eq("groupId", args.groupId)).take(100);
    const memberProfiles = [];

    for (const member of members) {
      const profile = await getProfileByToken(ctx, member.memberTokenIdentifier);
      if (profile) memberProfiles.push(profile);
    }

    return await getExchangeMatches(ctx, identity.tokenIdentifier, memberProfiles);
  },
});

export const leave = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_memberTokenIdentifier", (q) => q.eq("groupId", args.groupId).eq("memberTokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!membership) return null;
    if (membership.role === "owner") throw new Error("El creador no puede salir del grupo por ahora");

    await ctx.db.delete(membership._id);
    return null;
  },
});
