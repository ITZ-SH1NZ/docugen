import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signedUrl } from '@/lib/storage';
import SingleRowReviewClient from '../../../../../../components/SingleRowReviewClient';
import type { BatchRecord, FlaggedPdfRow, TemplateFieldRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ReviewRowPage({
  params,
}: {
  params: Promise<{ id: string; row: string }>;
}) {
  const { id: batchId, row: rowStr } = await params;
  const rowIndex = parseInt(rowStr, 10);
  if (isNaN(rowIndex)) notFound();

  const supabase = await createClient();

  // 1. Fetch batch
  const { data: batchData } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single();
  const batch = batchData as BatchRecord | null;
  if (!batch) notFound();

  // 2. Fetch template and fields
  const { data: template } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', batch.template_id)
    .single();
  if (!template) notFound();
  
  const templateFields = (template.template_fields ?? []) as TemplateFieldRow[];
  const sortedFields = templateFields
    .sort((a, b) => a.field_index - b.field_index)
    .map((f) => ({ index: f.field_index, label: f.label }));

  // 3. Fetch all flagged rows in this batch to support prev/next navigation
  const { data: flaggedData } = await supabase
    .from('flagged_pdfs')
    .select('*')
    .eq('batch_id', batchId)
    .order('row_index');
  const flaggedRows = (flaggedData ?? []) as FlaggedPdfRow[];

  // Find current flagged row
  const currentFlaggedIdx = flaggedRows.findIndex((r) => r.row_index === rowIndex);
  if (currentFlaggedIdx === -1) notFound();
  
  const currentRow = flaggedRows[currentFlaggedIdx];

  // Previous and next flagged row indices
  const prevRowIndex = currentFlaggedIdx > 0 ? flaggedRows[currentFlaggedIdx - 1].row_index : null;
  const nextRowIndex = currentFlaggedIdx < flaggedRows.length - 1 ? flaggedRows[currentFlaggedIdx + 1].row_index : null;

  // Sign PDF URL for inline rendering
  const pdfUrl = currentRow.pdf_storage_path
    ? await signedUrl('batches', currentRow.pdf_storage_path, 60 * 60)
    : null;

  return (
    <SingleRowReviewClient
      batchId={batchId}
      rowIndex={rowIndex}
      csvData={currentRow.csv_data as string[]}
      flags={currentRow.flags}
      pdfUrl={pdfUrl}
      templateFields={sortedFields}
      edited={currentRow.edited}
      flaggedCount={flaggedRows.length}
      currentFlaggedNum={currentFlaggedIdx + 1}
      prevRowIndex={prevRowIndex}
      nextRowIndex={nextRowIndex}
    />
  );
}
