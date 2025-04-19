import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("dueDate"), today.getTime()))
      .collect();
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await ctx.db.insert("todos", {
      text: args.text,
      description: "",
      completed: false,
      userId,
      hidden: false,
      dueDate: today.getTime(),
      drawing: undefined,
    });
  },
});

export const updateDrawing = mutation({
  args: { 
    id: v.id("todos"),
    drawing: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    await ctx.db.patch(args.id, { drawing: args.drawing });
  },
});

export const toggleComplete = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    await ctx.db.patch(args.id, { completed: !todo.completed });
  },
});

export const updateText = mutation({
  args: { id: v.id("todos"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    await ctx.db.patch(args.id, { text: args.text });
  },
});

export const updateDescription = mutation({
  args: { id: v.id("todos"), description: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    await ctx.db.patch(args.id, { description: args.description });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    await ctx.db.delete(args.id);
  },
});

export const moveToNextDay = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) throw new Error("Todo not found");

    const nextDay = new Date(todo.dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    await ctx.db.patch(args.id, { dueDate: nextDay.getTime() });
  },
});
