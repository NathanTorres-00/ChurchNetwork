import { cronJobs } from 'convex/server';
import { internal } from './_generated/api.js';

const crons = cronJobs();

// Recordings that were uploaded but never posted (or whose post failed) don't linger
crons.hourly('clean up unattached voice memo uploads', { minuteUTC: 17 }, internal.marks.cleanupUploads, {});

export default crons;
