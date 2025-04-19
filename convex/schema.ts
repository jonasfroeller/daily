import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  todos: defineTable({
    text: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    userId: v.id("users"),
    hidden: v.boolean(),
    dueDate: v.number(),
    drawing: v.optional(v.string()),
  }).index("by_user", ["userId"]),
  
  documents: defineTable({
    title: v.string(),
    content: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    emoji: v.optional(v.string()),
    drawing: v.optional(v.string()),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
