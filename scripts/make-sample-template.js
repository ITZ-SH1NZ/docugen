// Generates a sample certificate template PDF for testing the engine.
// In production the template PDF comes from a user upload; this just gives us
// something realistic to overlay onto.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'test', 'certificate_template.pdf');

const WIDTH = 842; // A4 landscape
const HEIGHT = 595;

const doc = await PDFDocument.create();
const page = doc.addPage([WIDTH, HEIGHT]);
const title = await doc.embedFont(StandardFonts.TimesRomanBold);
const body = await doc.embedFont(StandardFonts.TimesRoman);

// Background + border
page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: rgb(0.99, 0.98, 0.94) });
page.drawRectangle({
  x: 24, y: 24, width: WIDTH - 48, height: HEIGHT - 48,
  borderColor: rgb(0.6, 0.45, 0.1), borderWidth: 3,
});

const center = (text, font, size, y) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (WIDTH - w) / 2, y, size, font, color: rgb(0.2, 0.15, 0.05) });
};

center('CERTIFICATE OF COMPLETION', title, 34, HEIGHT - 120);
center('This is proudly presented to', body, 16, HEIGHT - 175);
center('for successfully completing', body, 16, HEIGHT - 300);

await writeFile(outPath, await doc.save());
console.log(`Wrote ${outPath}`);
