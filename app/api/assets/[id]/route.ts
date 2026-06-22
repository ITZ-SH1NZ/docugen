import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadBytes } from '@/lib/storage';

export const runtime = 'nodejs';

// GET /api/assets/:id — serve asset file (font / image)
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

  // Fetch the asset first to get storage path
  const { data: asset, error: fetchErr } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  try {
    const bytes = await downloadBytes('assets', asset.storage_path);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (asset.name.endsWith('.ttf')) contentType = 'font/ttf';
    else if (asset.name.endsWith('.otf')) contentType = 'font/otf';
    else if (asset.name.endsWith('.woff')) contentType = 'font/woff';
    else if (asset.name.endsWith('.woff2')) contentType = 'font/woff2';
    else if (asset.name.endsWith('.png')) contentType = 'image/png';
    else if (asset.name.endsWith('.jpg') || asset.name.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (asset.name.endsWith('.webp')) contentType = 'image/webp';

    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve asset data' }, { status: 500 });
  }
}

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
