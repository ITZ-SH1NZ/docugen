import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { resolveStandardFont, fontKey } from './fonts.js';
import { fitText } from './textFit.js';
import { applyTransform } from './template.js';

// Renders a single row onto a fresh copy of the template PDF.
//
// `customFonts` is a Map(fontKey -> woff2 bytes) preloaded once per batch (see
// buildBatch), so file reads don't happen per row. Each field picks its own
// font via field.font_family + field.font_weight.
//
// Coordinate convention: field.x / field.y is the TOP-LEFT corner of the box,
// measured from the top-left of the page. PDF's origin is bottom-left, so we
// convert with `pageHeight - y`.
export async function renderRow(templateBytes, template, rowData, customFonts) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  if (customFonts && customFonts.size > 0) pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.getPages()[0];
  const pageHeight = page.getHeight();

  // Embed each distinct font once per document (keyed by family+weight).
  const embedded = new Map();
  const getFont = async (family, weight) => {
    const key = fontKey(family, weight);
    if (embedded.has(key)) return embedded.get(key);

    let font;
    const bytes = customFonts && customFonts.get(key);
    if (bytes) {
      // Subset to keep output small; fontkit handles woff2.
      font = await pdfDoc.embedFont(bytes, { subset: true });
    } else {
      font = await pdfDoc.embedFont(resolveStandardFont(family));
    }
    embedded.set(key, font);
    return font;
  };

  const fieldResults = [];

  for (const field of template.fields) {
    const raw = rowData[field.index] ?? '';
    const text = applyTransform(raw, field.transform);
    const font = await getFont(field.font_family, field.font_weight);
    const fit = fitText(text, field, font);

    drawLines(page, font, fit, field, pageHeight);
    fieldResults.push({ field, fit });
  }

  const bytes = await pdfDoc.save();
  return { bytes, fieldResults };
}

function drawLines(page, font, fit, field, pageHeight) {
  const { lines, fontSize, lineHeight } = fit;
  const color = rgb(field.color.r, field.color.g, field.color.b);

  // Top of the box in PDF (bottom-left origin) coordinates.
  const boxTop = pageHeight - field.y;

  lines.forEach((line, i) => {
    const textWidth = font.widthOfTextAtSize(line, fontSize);
    let x = field.x;
    if (field.alignment === 'center') {
      x = field.x + (field.width - textWidth) / 2;
    } else if (field.alignment === 'right') {
      x = field.x + (field.width - textWidth);
    }

    const baseline = boxTop - i * lineHeight - font.heightAtSize(fontSize);
    page.drawText(line, { x, y: baseline, size: fontSize, font, color });
  });
}
