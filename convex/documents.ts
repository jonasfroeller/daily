import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return documents;
  },
});

export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || document.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    return document;
  },
});

export const create = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    const documentId = await ctx.db.insert("documents", {
      title: "Untitled Document",
      content: "",
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(id);
    if (!existingDocument) {
      throw new Error("Document not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || existingDocument.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updatedDocument = await ctx.db.patch(id, {
      ...rest,
      updatedAt: Date.now(),
    });

    return updatedDocument;
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) {
      throw new Error("Document not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || existingDocument.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateDrawing = mutation({
  args: {
    id: v.id("documents"),
    drawing: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) {
      throw new Error("Document not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || existingDocument.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      drawing: args.drawing,
      updatedAt: Date.now(),
    });
  },
});
