import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import { uploadBytes } from '@/lib/storage';

export const runtime = 'nodejs';

// GET /api/templates — list the signed-in user's templates (with fields).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/templates — create a template from an uploaded PDF.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const pdf = form.get('pdf');

  if (!name) return NextResponse.json({ error: 'Template name is required.' }, { status: 400 });
  if (!pdf || typeof pdf === 'string') {
    return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await pdf.arrayBuffer());

  // Read the first page size (PDF points) for the editor's coordinate space.
  let pageWidth = 0;
  let pageHeight = 0;
  try {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPages()[0];
    pageWidth = page.getWidth();
    pageHeight = page.getHeight();
  } catch {
    return NextResponse.json({ error: 'Could not read that PDF.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const path = `${user.id}/${id}/template.pdf`;

  try {
    await uploadBytes('templates', path, bytes, 'application/pdf');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      id,
      user_id: user.id,
      name,
      pdf_storage_path: path,
      page_width: pageWidth,
      page_height: pageHeight,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
