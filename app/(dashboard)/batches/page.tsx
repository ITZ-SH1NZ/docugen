import { createClient } from '@/lib/supabase/server';
import BatchesListClient from '@/components/BatchesListClient';
import type { BatchRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface BatchWithTemplate extends BatchRecord {
  templates?: {
    name: string;
  } | null;
}

export default async function BatchesPage() {
  const supabase = await createClient();

  // Query batches with templates join to get the template name
  const { data } = await supabase
    .from('batches')
    .select('*, templates(name)')
    .order('created_at', { ascending: false });

  const batches = (data ?? []) as BatchWithTemplate[];

  return <BatchesListClient initialBatches={batches} />;
}
