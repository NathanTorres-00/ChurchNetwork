import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server.js';
import { GLOBAL_RATE_MAX, LIST_MAX, MAX_AUDIO_BYTES, RATE_MAX, RATE_WINDOW_MS, validateMark } from './limits.js';
import { markFields } from './schema.js';

const isOwnerKey = key => !!process.env.OWNER_KEY && key === process.env.OWNER_KEY;
const UNATTACHED_UPLOAD_MS = 60 * 60 * 1000;   // uploads no mark uses are cleaned up after an hour

// A mark as the browser sees it: device IDs and storage IDs stay on the server. `mine` says whether the
// asking device made it, so its author can delete it.
async function present(ctx, m, deviceId) {
  const { deviceId: owner, clientId, audio, ...rest } = m;
  const out = { ...rest, mine: deviceId != null && owner === deviceId };
  if (audio) {
    out.audio = { mime: audio.mime, durationMs: audio.durationMs };
    out.audioUrl = await ctx.storage.getUrl(audio.storageId);
  }
  return out;
}

// The newest marks on a page, oldest first
export const list = query({
  args: { page: v.string(), deviceId: v.optional(v.string()) },
  handler: async (ctx, { page, deviceId }) => {
    const newest = await ctx.db.query('marks').withIndex('by_page', q => q.eq('page', page)).order('desc').take(LIST_MAX);
    newest.sort((a, b) => a._creationTime - b._creationTime);
    return Promise.all(newest.map(m => present(ctx, m, deviceId)));
  },
});

export const create = mutation({
  args: markFields,
  handler: async (ctx, args) => {
    const input = { ...args, author: args.author.trim() };
    if (validateMark(input)) throw new ConvexError('INVALID');

    // A retried post (same draft) returns the mark it already made
    if (input.clientId) {
      const existing = await ctx.db.query('marks').withIndex('by_client', q => q.eq('clientId', input.clientId)).first();
      if (existing) return existing._id;
    }

    const since = Date.now() - RATE_WINDOW_MS;
    const recent = await ctx.db.query('marks')
      .withIndex('by_device', q => q.eq('deviceId', input.deviceId).gt('_creationTime', since))
      .take(RATE_MAX);
    if (recent.length >= RATE_MAX) throw new ConvexError('RATE_LIMIT');
    const everyone = await ctx.db.query('marks').withIndex('by_creation_time', q => q.gt('_creationTime', since)).take(GLOBAL_RATE_MAX);
    if (everyone.length >= GLOBAL_RATE_MAX) throw new ConvexError('RATE_LIMIT');

    // A voice memo must point at an uploaded audio file that no other mark uses
    if (input.audio) {
      const file = await ctx.db.system.get(input.audio.storageId);
      if (!file || file.size > MAX_AUDIO_BYTES) throw new ConvexError('INVALID');
      if (file.contentType && !file.contentType.startsWith('audio/')) throw new ConvexError('INVALID');
      const taken = await ctx.db.query('marks').withIndex('by_storage', q => q.eq('audio.storageId', input.audio.storageId)).first();
      if (taken) throw new ConvexError('INVALID');
    }

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

// Deletes uploaded files that no mark uses (abandoned recordings, or uploads that were never posted).
// Runs hourly from crons.js.
export const cleanupUploads = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, { olderThanMs = UNATTACHED_UPLOAD_MS }) => {
    const cutoff = Date.now() - olderThanMs;
    const oldest = await ctx.db.system.query('_storage').order('asc').take(500);
    let removed = 0;
    for (const file of oldest.filter(f => f._creationTime <= cutoff)) {
      const used = await ctx.db.query('marks').withIndex('by_storage', q => q.eq('audio.storageId', file._id)).first();
      if (!used) { await ctx.storage.delete(file._id); removed++; }
    }
    return removed;
  },
});
