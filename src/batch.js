import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, isAbsolute, join } from 'node:path';
import { parseCsv } from './csv.js';
import { loadTemplate, normalizeTemplate } from './template.js';
import { renderRow } from './render.js';
import { fontKey, loadCustomFontBytes } from './fonts.js';

// Load each distinct custom (family, weight) used by the template ONCE, so the
// per-row render loop never touches the filesystem. Returns Map(fontKey -> bytes).
async function preloadCustomFonts(fields) {
  const wanted = new Map();
  for (const f of fields) {
    const key = fontKey(f.font_family, f.font_weight);
    if (!wanted.has(key)) wanted.set(key, { family: f.font_family, weight: f.font_weight });
  }
  const out = new Map();
  await Promise.all(
    [...wanted.entries()].map(async ([key, { family, weight }]) => {
      const bytes = await loadCustomFontBytes(family, weight);
      if (bytes) out.set(key, bytes);
    }),
  );
  return out;
}

// Pure, in-memory batch generation — no filesystem. Used by both the CLI
// (which wraps it with file I/O) and the web API route (which feeds it
// uploaded bytes directly). Returns { metadata, files: [{ name, bytes }] }.
export async function buildBatch({ template, templateBytes, csvText, batchId, onProgress, preloadedFonts }) {
  const normalized = normalizeTemplate(template);
  const rows = parseCsv(csvText);
  const customFonts = preloadedFonts || await preloadCustomFonts(normalized.fields);

  const files = [];
  const allRows = [];
  const flaggedRows = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowData = rows[rowIndex];
    const pdfName = `row_${rowIndex}.pdf`;

    const { bytes, fieldResults } = await renderRow(templateBytes, normalized, rowData, customFonts);
    files.push({ name: pdfName, bytes });

    const flags = collectFlags(fieldResults);
    const record = {
      row_index: rowIndex,
      csv_data: rowData,
      flags,
      pdf_path: pdfName,
    };
    allRows.push(record);
    if (flags.length > 0) flaggedRows.push(record);

    if (onProgress) {
      await onProgress({
        generated: rowIndex + 1,
        total: rows.length,
        flagged: flaggedRows.length,
      });
    }
  }

  const metadata = {
    batch_id: batchId,
    template_id: normalized.template_id,
    timestamp: new Date().toISOString(),
    total_rows: rows.length,
    generated_count: files.length,
    flagged_count: flaggedRows.length,
    output_dir: batchId,
    flagged_rows: flaggedRows,
    all_rows: allRows,
  };

  return { metadata, files };
}

// CLI entry: load template + base PDF + CSV from disk, generate, write outputs.
export async function runBatch({ templatePath, csvPath, outputDir, batchId }) {
  const template = await loadTemplate(templatePath);

  // Resolve the base PDF path relative to the template file if it isn't absolute.
  const pdfPath = isAbsolute(template.pdf_path)
    ? template.pdf_path
    : resolve(dirname(templatePath), template.pdf_path);
  const templateBytes = await readFile(pdfPath);
  const csvText = await readFile(csvPath, 'utf8');

  const { metadata, files } = await buildBatch({
    template,
    templateBytes,
    csvText,
    batchId,
  });

  const batchDir = join(outputDir, batchId);
  await mkdir(batchDir, { recursive: true });
  for (const file of files) {
    await writeFile(join(batchDir, file.name), file.bytes);
  }
  metadata.output_dir = batchDir;
  await writeFile(
    join(batchDir, 'batch_metadata.json'),
    JSON.stringify(metadata, null, 2),
  );

  return metadata;
}

// Flatten per-field fit results into the flat flag list the contract expects.
function collectFlags(fieldResults) {
  const flags = [];
  for (const { field, fit } of fieldResults) {
    for (const f of fit.flags) {
      flags.push({
        field_index: field.index,
        field_label: field.label,
        flag_type: f.flag_type,
        details: f.details,
      });
    }
  }
  return flags;
}
