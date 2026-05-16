import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    ownerTokenIdentifier: v.string(),
    displayName: v.string(),
    regionCode: v.string(),
    regionName: v.string(),
    commune: v.string(),
    whatsapp: v.string(),
    instagram: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_ownerTokenIdentifier", ["ownerTokenIdentifier"])
    .index("by_regionCode", ["regionCode"])
    .index("by_regionCode_and_commune", ["regionCode", "commune"]),
  userStickers: defineTable({
    ownerTokenIdentifier: v.string(),
    stickerId: v.string(),
    isOwned: v.boolean(),
    isDuplicate: v.boolean(),
    duplicateQuantity: v.optional(v.number()),
    isWanted: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_ownerTokenIdentifier", ["ownerTokenIdentifier"])
    .index("by_ownerTokenIdentifier_and_stickerId", ["ownerTokenIdentifier", "stickerId"])
    .index("by_stickerId", ["stickerId"]),
  albumPreferences: defineTable({
    ownerTokenIdentifier: v.string(),
    wantedMode: v.union(v.literal("allMissing"), v.literal("specific")),
    updatedAt: v.number(),
  }).index("by_ownerTokenIdentifier", ["ownerTokenIdentifier"]),
  stores: defineTable({
    name: v.string(),
    regionCode: v.string(),
    regionName: v.string(),
    commune: v.string(),
    address: v.string(),
    whatsapp: v.optional(v.string()),
    instagram: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.string(),
    categories: v.array(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_regionCode", ["regionCode"])
    .index("by_regionCode_and_commune", ["regionCode", "commune"]),
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    inviteCode: v.string(),
    createdByTokenIdentifier: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_visibility", ["visibility"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_createdByTokenIdentifier", ["createdByTokenIdentifier"]),
  groupMembers: defineTable({
    groupId: v.id("groups"),
    memberTokenIdentifier: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_memberTokenIdentifier", ["memberTokenIdentifier"])
    .index("by_groupId_and_memberTokenIdentifier", ["groupId", "memberTokenIdentifier"]),
  marketListings: defineTable({
    sellerTokenIdentifier: v.string(),
    stickerId: v.string(),
    stickerName: v.string(),
    stickerSection: v.string(),
    kind: v.union(v.literal("normal"), v.literal("extraCard")),
    price: v.number(),
    description: v.optional(v.string()),
    regionCode: v.string(),
    regionName: v.string(),
    commune: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("sold")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_sellerTokenIdentifier", ["sellerTokenIdentifier"])
    .index("by_stickerId", ["stickerId"])
    .index("by_regionCode_and_commune", ["regionCode", "commune"]),
});
