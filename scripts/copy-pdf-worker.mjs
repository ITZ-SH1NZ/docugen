// Copies the pdf.js worker into /public so the editor + preview load it locally
// (no CDN round-trip). Runs automatically before dev/build.
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = join(root, 'public', 'pdf.worker.min.mjs');

try {
  await mkdir(join(root, 'public'), { recursive: true });
  await copyFile(src, dest);
  console.log('Copied pdf.worker.min.mjs → public/');
} catch (err) {
  console.warn('Could not copy pdf worker:', err.message);
}
