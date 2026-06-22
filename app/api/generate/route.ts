import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadBytes } from '@/lib/storage';
import { processBatch } from '@/lib/processBatch';
import { parseCsv } from '@/src/csv.js';

export const runtime = 'nodejs';

// POST /api/generate — upload CSV, create a batch, enqueue the generation job.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const templateId = String(form.get('template_id') || '');
  const batchName = String(form.get('batch_name') || '') || null;
  const csv = form.get('csv');

  if (!templateId) return NextResponse.json({ error: 'template_id is required' }, { status: 400 });
  if (!csv || typeof csv === 'string') {
    return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
  }

  // Verify the template belongs to this user (RLS-backed select).
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .single();
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const csvText = await csv.text();
  const totalRows = parseCsv(csvText).length;

  const batchId = crypto.randomUUID();
  const csvPath = `${user.id}/${batchId}/input.csv`;
  await uploadBytes('batches', csvPath, new TextEncoder().encode(csvText), 'text/csv');

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      id: batchId,
      user_id: user.id,
      template_id: templateId,
      name: batchName,
      status: 'queued',
      total_rows: totalRows,
      csv_storage_path: csvPath,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate after the response is sent — no external queue. Runs to completion
  // on the long-lived Node server; progress is polled from the batches row.
  after(() => processBatch(batchId, user.id));

  return NextResponse.json(batch, { status: 201 });
}
