import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signedUrl } from '@/lib/storage';
import EditorClient from '@/components/TemplateEditor/EditorClient';
import type { TemplateField, TemplateFieldRow, TemplateRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', id)
    .single();

  const template = data as (TemplateRecord & { template_fields: TemplateFieldRow[] }) | null;
  if (!template || !template.pdf_storage_path) notFound();

  const url = await signedUrl('templates', template.pdf_storage_path, 60 * 60);
  if (!url) notFound();

  // Fetch custom fonts uploaded by user
  let customFonts: string[] = [];
  try {
    const { data: assets } = await supabase
      .from('assets')
      .select('name')
      .eq('type', 'font');
    if (assets) {
      customFonts = assets.map((a) => a.name);
    }
  } catch (e) {
    // Graceful fallback if table does not exist
  }

  // Map persisted rows to the editor's field shape (client id = db id).
  const fields: TemplateField[] = (template.template_fields ?? [])
    .sort((a, b) => a.field_index - b.field_index)
    .map((f) => ({
      id: f.id,
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

  return (
    <EditorClient
      templateId={template.id}
      templateName={template.name}
      pdfUrl={url}
      pageWidth={template.page_width ?? 595}
      pageHeight={template.page_height ?? 842}
      initialFields={fields}
      customFonts={customFonts}
    />
  );
}
