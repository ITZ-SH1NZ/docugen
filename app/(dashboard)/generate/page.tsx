import { createClient } from '@/lib/supabase/server';
import { signedUrl } from '@/lib/storage';
import GenerateClient from '@/components/GenerateClient';
import type { TemplateRecord, TemplateFieldRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: preselect } = await searchParams;
  const supabase = await createClient();

  // Fetch templates and their full fields definition
  const { data } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .order('created_at', { ascending: false });

  const templatesRaw = (data ?? []) as (TemplateRecord & {
    template_fields: TemplateFieldRow[];
  })[];

  const templates = await Promise.all(
    templatesRaw.map(async (t) => {
      const pdfUrl = t.pdf_storage_path 
        ? await signedUrl('templates', t.pdf_storage_path, 60 * 60) 
        : '';
      return {
        id: t.id,
        name: t.name,
        pdfUrl: pdfUrl ?? '',
        page_width: t.page_width ?? 595,
        page_height: t.page_height ?? 842,
        fields: t.template_fields.sort((a, b) => a.field_index - b.field_index),
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Generate Documents</h1>
        <p className="text-sm text-text-secondary mt-1">
          Automate document creation from CSV data in a five-step wizard.
        </p>
      </div>
      
      <GenerateClient templates={templates} preselect={preselect} />
    </div>
  );
}
