import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadBytes } from '@/lib/storage';

export const runtime = 'nodejs';

// GET /api/assets — list user's uploaded assets (images & custom fonts)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    // Gracefully handle if table does not exist yet (migration not run)
    if (error) {
      if (error.code === 'P0001' || error.message.includes('does not exist')) {
        return NextResponse.json([]); // Return empty list gracefully
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/assets — upload custom font (.ttf/.otf/.woff2) or image (.png/.jpg)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const filename = file.name;
    const fileType = filename.endsWith('.ttf') || filename.endsWith('.otf') || filename.endsWith('.woff2') || filename.endsWith('.woff')
      ? 'font'
      : 'image';

    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/assets/${id}_${filename}`;

    // Upload to "assets" bucket
    await uploadBytes('assets', storagePath, bytes, file.type || 'application/octet-stream');

    // Insert into assets table
    const { data, error } = await supabase
      .from('assets')
      .insert({
        id,
        user_id: user.id,
        name: filename,
        type: fileType,
        storage_path: storagePath,
        size_bytes: file.size,
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, return a descriptive message to run migration
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Please run the assets database migration: supabase/migrations/0002_assets.sql in your Supabase SQL editor first!'
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
