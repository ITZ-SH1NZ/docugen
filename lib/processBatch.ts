import JSZip from 'jszip';
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadBytes, uploadBytes } from '@/lib/storage';
import { toEngineTemplate } from '@/lib/engineAdapter';
import { buildBatch } from '@/src/batch.js';
import type { TemplateFieldRow } from '@/lib/types';

// Generates a batch in-process (no external queue). Invoked fire-and-forget via
// `after()` from the generate route, so the HTTP response returns immediately
// while this runs to completion on the (long-lived) Node server. All progress is
// written to the batches row, which the SSE endpoint polls.
//
// This assumes a persistent Node process (`next start` on a VM / Railway / Render),
// not a short-lived serverless function. For durability across restarts or true
// background scaling, swap this for a pg-boss queue on the same Supabase Postgres.
export async function processBatch(batchId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  const started = Date.now();

  try {
    await admin
      .from('batches')
      .update({ status: 'processing', started_at: new Date().toISOString(), progress: 0 })
      .eq('id', batchId);

    const { data: batch } = await admin.from('batches').select('*').eq('id', batchId).single();
    if (!batch) throw new Error('Batch not found');

    const { data: template } = await admin
      .from('templates')
      .select('*, template_fields(*)')
      .eq('id', batch.template_id)
      .single();
    if (!template) throw new Error('Template not found');

    const templateBytes = await downloadBytes('templates', template.pdf_storage_path);
    const csvText = new TextDecoder().decode(
      await downloadBytes('batches', batch.csv_storage_path),
    );

    const engineTemplate = toEngineTemplate(
      template.id,
      template.template_fields as TemplateFieldRow[],
    );

    // Render all rows in memory (fast). Progress writes are fire-and-forget so
    // the render loop never blocks on the database; we await them before the
    // final "completed" write so a late one can't overwrite it.
    let lastPct = -1;
    const progressWrites: PromiseLike<unknown>[] = [];
    const { metadata, files } = await buildBatch({
      template: engineTemplate,
      templateBytes,
      csvText,
      batchId,
      onProgress: ({ generated, total, flagged }) => {
        const pct = total ? Math.round((generated / total) * 100) : 100;
        if (pct !== lastPct && pct < 100) {
          lastPct = pct;
          progressWrites.push(
            admin
              .from('batches')
              .update({ progress: pct, generated_count: generated, flagged_count: flagged })
              .eq('id', batchId)
              .then(undefined, () => {}),
          );
        }
      },
    });

    const flaggedIdx = new Set(metadata.flagged_rows.map((r) => r.row_index));
    const pdfPath = (i: number) => `${userId}/${batchId}/pdfs/row_${i}.pdf`;

    const metaPath = `${userId}/${batchId}/metadata.json`;

    // Upload ONLY what the UI needs: the metadata and the flagged PDFs
    // (for inline review). Clean PDFs live in the zip which is generated on the fly on download.
    await uploadBytes(
      'batches',
      metaPath,
      new TextEncoder().encode(JSON.stringify(metadata)),
      'application/json',
    );

    const flaggedUploads = files
      .filter((f) => flaggedIdx.has(Number(/row_(\d+)\.pdf/.exec(f.name)?.[1])))
      .map((f) => {
        const idx = Number(/row_(\d+)\.pdf/.exec(f.name)?.[1]);
        return async () => {
          try {
            await uploadBytes('batches', pdfPath(idx), f.bytes, 'application/pdf');
          } catch (e) {
            console.warn(`[processBatch] flagged preview upload failed for row ${idx}:`, e);
          }
        };
      });
    await runWithConcurrency(flaggedUploads, 8);

    // Persist row records (chunked). pdf_storage_path is set only for flagged
    // rows (the ones actually uploaded); clean rows download via the zip.
    const batchPdfRows = metadata.all_rows.map((r) => ({
      batch_id: batchId,
      row_index: r.row_index,
      pdf_storage_path: flaggedIdx.has(r.row_index) ? pdfPath(r.row_index) : null,
      csv_data: r.csv_data,
      has_flags: r.flags.length > 0,
    }));
    for (let i = 0; i < batchPdfRows.length; i += 500) {
      await admin
        .from('batch_pdfs')
        .upsert(batchPdfRows.slice(i, i + 500), { onConflict: 'batch_id,row_index' });
    }

    if (metadata.flagged_rows.length > 0) {
      await admin.from('flagged_pdfs').upsert(
        metadata.flagged_rows.map((r) => ({
          batch_id: batchId,
          row_index: r.row_index,
          flags: r.flags,
          csv_data: r.csv_data,
          pdf_storage_path: pdfPath(r.row_index),
        })),
        { onConflict: 'batch_id,row_index' },
      );
    }

    // Ensure no in-flight progress write lands after we mark completed.
    await Promise.allSettled(progressWrites);

    const elapsed = Date.now() - started;
    await admin
      .from('batches')
      .update({
        status: 'completed',
        progress: 100,
        generated_count: metadata.generated_count,
        flagged_count: metadata.flagged_count,
        metadata_storage_path: metaPath,
        output_zip_path: 'dynamic',
        completed_at: new Date().toISOString(),
        generation_time_ms: elapsed,
        avg_time_per_pdf_ms: metadata.generated_count
          ? Math.round(elapsed / metadata.generated_count)
          : 0,
        output_size_mb: 0.0,
      })
      .eq('id', batchId);
  } catch (err) {
    console.error(`[processBatch] ${batchId} failed:`, err);
    await admin
      .from('batches')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', batchId);
  }
}

// Run async tasks with a bounded number in flight at once.
async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
}
