import { createClient } from '@/lib/supabase/server';
import TemplatesListClient from '@/components/TemplatesListClient';
import type { TemplateRecord, BatchRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const supabase = await createClient();

  // Fetch Templates
  const { data: templatesRaw } = await supabase
    .from('templates')
    .select('*, template_fields(id)')
    .order('created_at', { ascending: false });
  const templates = (templatesRaw ?? []) as (TemplateRecord & { template_fields: { id: string }[] })[];

  // Fetch Batches
  const { data: batchesRaw } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false });
  const batches = (batchesRaw ?? []) as BatchRecord[];

  const now = new Date();

  const templatesWithStats = templates.map((temp) => {
    const tempBatches = batches.filter((b) => b.template_id === temp.id);
    const docCount = tempBatches.reduce((sum, b) => sum + (b.generated_count || 0), 0);
    const flagCount = tempBatches.reduce((sum, b) => sum + (b.flagged_count || 0), 0);

    const editedDate = new Date(temp.updated_at || temp.created_at);
    const diffMs = now.getTime() - editedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeLabel = 'Just now';
    if (diffDays > 0) timeLabel = `${diffDays}d ago`;
    else if (diffHours > 0) timeLabel = `${diffHours}h ago`;
    else if (diffMins > 0) timeLabel = `${diffMins}m ago`;

    return {
      ...temp,
      fieldCount: temp.template_fields?.length ?? 0,
      docCount,
      flagCount,
      timeLabel,
    };
  });

  return <TemplatesListClient initialTemplates={templatesWithStats} />;
}
