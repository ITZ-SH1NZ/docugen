import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// DELETE /api/assets/:id — delete asset from database and storage
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch the asset first to get storage path
  const { data: asset, error: fetchErr } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Delete from storage (via admin client to ensure we have access)
  const admin = createAdminClient();
  await admin.storage.from('assets').remove([asset.storage_path]);

  // Delete from table
  const { error: deleteErr } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
