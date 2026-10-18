import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// A point tied to an element, as fractions of that element's box. vw is the window width when it was made.
export const anchor = v.object({ path: v.string(), fx: v.number(), fy: v.number(), vw: v.number() });

export const markFields = {
  page: v.string(),
  kind: v.union(v.literal('comment'), v.literal('voice'), v.literal('arrow'), v.literal('highlight')),
  at: v.optional(anchor),             // comment, voice
  from: v.optional(anchor),           // arrow tail, highlight corner
  to: v.optional(anchor),             // arrow head, opposite highlight corner
  text: v.optional(v.string()),       // comment text, voice title, arrow/highlight note
  audio: v.optional(v.object({ storageId: v.id('_storage'), mime: v.string(), durationMs: v.number() })),
  author: v.string(),
  deviceId: v.string(),
};

export default defineSchema({
  marks: defineTable({ ...markFields, resolved: v.boolean() })
    .index('by_page', ['page'])
    .index('by_device', ['deviceId']),
});
