// Writes review/config.js for local work, from CONVEX_URL or the one `npx convex dev` saved in .env.local.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configSource } from './build-static.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let url = process.env.CONVEX_URL;
const envFile = join(root, '.env.local');
if (!url && existsSync(envFile)) {
  url = readFileSync(envFile, 'utf8').match(/^CONVEX_URL=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
}
if (!url) throw new Error('No CONVEX_URL: run `npx convex dev` first.');
mkdirSync(join(root, 'review'), { recursive: true });
writeFileSync(join(root, 'review', 'config.js'), configSource(url));
console.log('Wrote review/config.js for', url);
