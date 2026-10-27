import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// A point tied to an element, as fractions of that element's box. vw is the window width when it was made.
export const anchor = v.object({ path: v.string(), fx: v.number(), fy: v.number(), vw: v.number() });

// A text position: the element at path, and the character offset o inside its i-th text node.
export const textPos = v.object({ path: v.string(), i: v.number(), o: v.number() });

// One freehand stroke. pts is flat x0,y0,x1,y1... offsets in CSS px from origin when drawn, rounded to 0.5.
// pr is per-point pen pressure, 0-1. size is the font size in px at the origin when drawn. w is the width it was
// drawn at, as a share of its ink's usual width (1 when missing). cut says which ends the eraser cut (1 the start,
// 2 the end, 3 both), drawn square rather than tapered.
// origin is the origin's page coordinates when drawn (used only for the card sketch).
export const stroke = v.object({
  ink: v.union(v.literal('pen'), v.literal('highlighter')),
  at: anchor,
  char: v.optional(textPos),
  size: v.number(),
  w: v.optional(v.number()),
  cut: v.optional(v.number()),
  origin: v.object({ x: v.number(), y: v.number() }),
  pts: v.array(v.number()),
  pr: v.optional(v.array(v.number())),
  text: v.optional(v.object({ start: textPos, end: textPos })),
  inside: v.optional(v.array(anchor)),
});

export const markFields = {
  page: v.string(),
  kind: v.union(v.literal('comment'), v.literal('voice'), v.literal('arrow'), v.literal('highlight'), v.literal('drawing')),
  at: v.optional(anchor),             // comment, voice
  from: v.optional(anchor),           // arrow tail, highlight corner
  to: v.optional(anchor),             // arrow head, opposite highlight corner
  w: v.optional(v.number()),          // arrow width, as a share of the usual (1 when missing)
  strokes: v.optional(v.array(stroke)), // drawing
  text: v.optional(v.string()),       // comment text, voice title, arrow/highlight note
  audio: v.optional(v.object({ storageId: v.id('_storage'), mime: v.string(), durationMs: v.number() })),
  author: v.string(),
  deviceId: v.string(),               // secret to the device that made the mark; never returned by a query
  clientId: v.optional(v.string()),   // the draft's id, so a retried post doesn't create a second mark
};

export default defineSchema({
  marks: defineTable({ ...markFields, resolved: v.boolean() })
    .index('by_page', ['page'])
    .index('by_device', ['deviceId'])
    .index('by_client', ['clientId'])
    .index('by_storage', ['audio.storageId']),
});
