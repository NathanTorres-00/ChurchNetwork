import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server.js';
import { RATE_MAX, RATE_WINDOW_MS, validateMark } from './limits.js';
import { markFields } from './schema.js';

const isOwnerKey = key => !!process.env.OWNER_KEY && key === process.env.OWNER_KEY;

// Every mark on a page, oldest first. Voice memos carry a URL to play them.
export const list = query({
  args: { page: v.string() },
  handler: async (ctx, { page }) => {
    const marks = await ctx.db.query('marks').withIndex('by_page', q => q.eq('page', page)).collect();
    marks.sort((a, b) => a._creationTime - b._creationTime);
    return Promise.all(marks.map(async m =>
      m.audio ? { ...m, audioUrl: await ctx.storage.getUrl(m.audio.storageId) } : m));
  },
});

export const create = mutation({
  args: markFields,
  handler: async (ctx, args) => {
    const input = { ...args, author: args.author.trim() };
    if (validateMark(input)) throw new ConvexError('INVALID');
    const since = Date.now() - RATE_WINDOW_MS;
    const recent = await ctx.db.query('marks')
      .withIndex('by_device', q => q.eq('deviceId', input.deviceId).gt('_creationTime', since))
      .take(RATE_MAX);
    if (recent.length >= RATE_MAX) throw new ConvexError('RATE_LIMIT');
    return ctx.db.insert('marks', { ...input, resolved: false });
  },
});

// A one-time URL the browser POSTs a recording to
export const generateUploadUrl = mutation({
  args: { deviceId: v.string() },
  handler: ctx => ctx.storage.generateUploadUrl(),
});

export const setResolved = mutation({
  args: { id: v.id('marks'), resolved: v.boolean(), ownerKey: v.string() },
  handler: async (ctx, { id, resolved, ownerKey }) => {
    if (!isOwnerKey(ownerKey)) throw new ConvexError('NOT_OWNER');
    if (!(await ctx.db.get(id))) throw new ConvexError('NOT_FOUND');
    await ctx.db.patch(id, { resolved });
    return null;
  },
});

// The owner can delete any mark; anyone can delete marks made on their own device
export const remove = mutation({
  args: { id: v.id('marks'), deviceId: v.string(), ownerKey: v.optional(v.string()) },
  handler: async (ctx, { id, deviceId, ownerKey }) => {
    const mark = await ctx.db.get(id);
    if (!mark) throw new ConvexError('NOT_FOUND');
    if (!isOwnerKey(ownerKey) && mark.deviceId !== deviceId) throw new ConvexError('NOT_OWNER');
    if (mark.audio) await ctx.storage.delete(mark.audio.storageId);
    await ctx.db.delete(id);
    return null;
  },
});

export const isOwner = query({
  args: { ownerKey: v.union(v.string(), v.null()) },
  handler: (ctx, { ownerKey }) => isOwnerKey(ownerKey),
});
