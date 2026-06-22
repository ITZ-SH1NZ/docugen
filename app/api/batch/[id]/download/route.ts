import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadBytes } from '@/lib/storage';
import { toEngineTemplate } from '@/lib/engineAdapter';
import { buildBatch } from '@/src/batch.js';
import JSZip from 'jszip';
import type { BatchRecord, TemplateRecord, TemplateFieldRow } from '@/lib/types';

export const runtime = 'nodejs';

// GET /api/batch/:id/download — generate the results ZIP in-memory on-the-fly
// and stream it to the user. This avoids storing huge ZIP files (100MB+) in Supabase,
// which easily exceeds the 500MB free storage quota.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Fetch batch
  const { data: batchData } = await supabase
    .from('batches')
    .select('*')
    .eq('id', id)
    .single();
  const batch = batchData as BatchRecord | null;
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

  // 2. Fetch template and template_fields
  const { data: templateData } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', batch.template_id)
    .single();
  const template = templateData as (TemplateRecord & { template_fields: TemplateFieldRow[] }) | null;
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  if (!batch.csv_storage_path) {
    return NextResponse.json({ error: 'CSV file path is missing' }, { status: 400 });
  }
  if (!template.pdf_storage_path) {
    return NextResponse.json({ error: 'Template file path is missing' }, { status: 400 });
  }

  try {
    // 3. Download base CSV and template PDF in parallel
    const [csvBytes, templateBytes] = await Promise.all([
      downloadBytes('batches', batch.csv_storage_path),
      downloadBytes('templates', template.pdf_storage_path),
    ]);

    const csvText = new TextDecoder().decode(csvBytes);
    const engineTemplate = toEngineTemplate(template.id, template.template_fields);

    // 4. Generate PDFs in-memory
    const { metadata, files } = await buildBatch({
      template: engineTemplate,
      templateBytes,
      csvText,
      batchId: id,
    });

    // 5. Pack ZIP with compression
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.name, f.bytes);
    }
    zip.file('batch_metadata.json', JSON.stringify(metadata, null, 2));

    const zipBuf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    // 6. Return streamed response
    const filename = `${batch.name || 'batch_' + id.slice(0, 8)}_results.zip`;
    return new NextResponse(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuf.length),
      },
    });
  } catch (err: any) {
    console.error('[DynamicDownload] failed:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
