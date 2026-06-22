import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signedUrl } from '@/lib/storage';

export const runtime = 'nodejs';

// GET /api/batch/:id/download — redirect to a short-lived signed URL for the
// results zip. Ownership is enforced by the RLS-scoped select below.
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

  const { data: batch } = await supabase
    .from('batches')
    .select('output_zip_path')
    .eq('id', id)
    .single();

  if (!batch?.output_zip_path) {
    return NextResponse.json({ error: 'Results not ready' }, { status: 404 });
  }

  const url = await signedUrl('batches', batch.output_zip_path, 120);
  if (!url) return NextResponse.json({ error: 'Could not sign URL' }, { status: 500 });
  return NextResponse.redirect(url);
}
