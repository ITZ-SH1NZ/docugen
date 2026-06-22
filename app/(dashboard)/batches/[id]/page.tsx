import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signedUrl } from '@/lib/storage';
import ProgressTracker from '@/components/ProgressTracker';
import ReviewClient from '@/components/ReviewClient';
import { ArrowLeft } from 'lucide-react';
import type { BatchRecord, FlaggedPdfRow, TemplateFieldRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from('batches').select('*').eq('id', id).single();
  const batch = data as BatchRecord | null;
  if (!batch) notFound();

  return (
    <div className="space-y-6">
      {/* Batch Header */}
      <div className="flex items-center gap-4 shrink-0 bg-white border border-border p-4 rounded-card shadow-sm">
        <Link href="/batches" className="p-2 hover:bg-muted text-text-secondary hover:text-text rounded-btn transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-bold text-lg text-text">
            {batch.name || `Batch ${batch.id.slice(0, 8)}`}
          </h1>
          <span className="text-xs text-text-secondary">
            Batch Run ID: <span className="font-mono">{batch.id}</span>
          </span>
        </div>
      </div>

      {/* Queued or Processing state */}
      {(batch.status === 'queued' || batch.status === 'processing') && (
        <ProgressTracker
          batchId={batch.id}
          initial={{
            status: batch.status,
            progress: batch.progress,
            generated_count: batch.generated_count,
            flagged_count: batch.flagged_count,
            total_rows: batch.total_rows ?? 0,
          }}
        />
      )}

      {/* Failed state */}
      {batch.status === 'failed' && (
        <div className="bg-white border border-border p-8 rounded-card shadow-card flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-error-bg text-error flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-text">Generation Failed</h3>
            <p className="text-sm text-text-secondary">{batch.error_message || 'An unknown error occurred during compilation.'}</p>
          </div>
          <Link href="/generate" className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn transition-all">
            Try again
          </Link>
        </div>
      )}

      {/* Completed state */}
      {batch.status === 'completed' && <CompletedView batchId={batch.id} batch={batch} />}
    </div>
  );
}

import { signedUrls } from '@/lib/storage';

async function CompletedView({ batchId, batch }: { batchId: string; batch: BatchRecord }) {
  const supabase = await createClient();

  // Fetch flagged PDFs and template fields in parallel
  const [flaggedRes, templateRes] = await Promise.all([
    supabase
      .from('flagged_pdfs')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_index'),
    supabase
      .from('templates')
      .select('template_fields(field_index, label)')
      .eq('id', batch.template_id)
      .single()
  ]);

  const flaggedRows = (flaggedRes.data ?? []) as FlaggedPdfRow[];
  const template = templateRes.data;

  const templateFields = (
    (template?.template_fields ?? []) as Pick<TemplateFieldRow, 'field_index' | 'label'>[]
  )
    .sort((a, b) => a.field_index - b.field_index)
    .map((f) => ({ index: f.field_index, label: f.label }));

  // Collect all non-null storage paths to sign in a single batch call
  const pathsToSign = flaggedRows
    .map((r) => r.pdf_storage_path)
    .filter((p): p is string => !!p);

  const signedUrlsMap = pathsToSign.length > 0 
    ? await signedUrls('batches', pathsToSign, 60 * 60)
    : {};

  const flagged = flaggedRows.map((r) => ({
    row_index: r.row_index,
    csv_data: r.csv_data,
    flags: r.flags,
    edited: r.edited,
    pdf_url: r.pdf_storage_path ? signedUrlsMap[r.pdf_storage_path] || null : null,
  }));

  return (
    <ReviewClient
      batchId={batchId}
      generatedCount={batch.generated_count}
      flaggedCount={batch.flagged_count}
      templateFields={templateFields}
      flagged={flagged}
    />
  );
}
