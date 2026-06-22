import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TemplateField } from '@/lib/types';

export const runtime = 'nodejs';

// PUT /api/templates/:id/fields — replace the template's field set.
// (Simple + correct: delete existing, insert the new set in one go.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership (RLS also enforces this on writes).
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .single();
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const body = (await request.json()) as { fields: TemplateField[] };
  const fields = body.fields ?? [];

  await supabase.from('template_fields').delete().eq('template_id', templateId);

  if (fields.length > 0) {
    const rows = fields.map((f) => ({
      template_id: templateId,
      field_index: f.field_index,
      label: f.label,
      field_type: f.field_type,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      max_font_size: f.max_font_size,
      min_font_size: f.min_font_size,
      font_family: f.font_family,
      font_weight: f.font_weight,
      alignment: f.alignment,
      color: f.color,
      transform: f.transform,
      wrap_text: f.wrap_text,
    }));
    const { error } = await supabase.from('template_fields').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from('templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  return NextResponse.json({ ok: true, count: fields.length });
}
