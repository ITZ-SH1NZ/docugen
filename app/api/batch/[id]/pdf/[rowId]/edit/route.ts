import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadBytes, downloadBytes, signedUrl } from '@/lib/storage';
import { toEngineTemplate } from '@/lib/engineAdapter';
import type { TemplateFieldRow } from '@/lib/types';
import { buildBatch } from '@/src/batch.js';

export const runtime = 'nodejs';

// Serialize one CSV row with RFC-4180 quoting.
function csvRow(values: string[]): string {
  return values
    .map((v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
    .join(',');
}

// POST /api/batch/:id/pdf/:rowId/edit — apply edited values, regenerate that
// single PDF, overwrite it in storage, and update its records.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const { id: batchId, rowId } = await params;
  const rowIndex = parseInt(rowId, 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Ownership via RLS-scoped select.
  const { data: batch } = await supabase
    .from('batches')
    .select('id, user_id, template_id')
    .eq('id', batchId)
    .single();
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

  const { data: template } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', batch.template_id)
    .single();
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const { data: rowRec } = await supabase
    .from('batch_pdfs')
    .select('csv_data')
    .eq('batch_id', batchId)
    .eq('row_index', rowIndex)
    .single();
  if (!rowRec) return NextResponse.json({ error: 'Row not found' }, { status: 404 });

  const { updates } = (await request.json()) as { updates: Record<string, string> };
  const csvData = [...(rowRec.csv_data as string[])];
  for (const [k, v] of Object.entries(updates)) csvData[Number(k)] = v;

  // Regenerate just this row.
  const templateBytes = await downloadBytes('templates', template.pdf_storage_path);
  const engineTemplate = toEngineTemplate(
    template.id,
    template.template_fields as TemplateFieldRow[],
  );
  const { metadata, files } = await buildBatch({
    template: engineTemplate,
    templateBytes,
    csvText: csvRow(csvData),
    batchId: `${batchId}-row-${rowIndex}`,
  });

  const newFlags = metadata.all_rows[0]?.flags ?? [];
  const pdfPath = `${batch.user_id}/${batchId}/pdfs/row_${rowIndex}.pdf`;
  await uploadBytes('batches', pdfPath, files[0].bytes, 'application/pdf');

  // Update records with the service-role client (writes to child tables).
  const admin = createAdminClient();
  await admin
    .from('batch_pdfs')
    .update({ csv_data: csvData, has_flags: newFlags.length > 0 })
    .eq('batch_id', batchId)
    .eq('row_index', rowIndex);

  await admin
    .from('flagged_pdfs')
    .upsert(
      {
        batch_id: batchId,
        row_index: rowIndex,
        csv_data: csvData,
        flags: newFlags,
        pdf_storage_path: pdfPath,
        edited: true,
        edited_by_user: true,
      },
      { onConflict: 'batch_id,row_index' },
    );

  const url = await signedUrl('batches', pdfPath, 60 * 60);
  return NextResponse.json({ ok: true, flags: newFlags, pdf_url: url, csv_data: csvData });
}
