import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';
import { FileText, Cpu, Layers, AlertTriangle, ArrowUpRight, Plus, ExternalLink } from 'lucide-react';
import type { BatchRecord, TemplateRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getUser();
  const email = user?.email ?? 'Tejas';
  const firstName = email.split('@')[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

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

  // Calculations
  const totalTemplates = templates.length;
  
  // Total documents generated across completed/processing batches
  const totalGenerated = batches.reduce((sum, b) => sum + (b.generated_count || 0), 0);
  
  // Flagged documents
  const totalFlagged = batches.reduce((sum, b) => sum + (b.flagged_count || 0), 0);

  // Generated this month (June 2026 or current calendar month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthGenerated = batches
    .filter(b => new Date(b.created_at) >= startOfMonth)
    .reduce((sum, b) => sum + (b.generated_count || 0), 0);

  // Map templates with stats from batches
  const recentTemplates = templates.slice(0, 5).map(temp => {
    const tempBatches = batches.filter(b => b.template_id === temp.id);
    const docCount = tempBatches.reduce((sum, b) => sum + (b.generated_count || 0), 0);
    const flagCount = tempBatches.reduce((sum, b) => sum + (b.flagged_count || 0), 0);
    
    // Human readable relative time for edit
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
      timeLabel,
      docCount,
      flagCount,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top greeting bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">
            Good morning, {capitalizedName} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here's what is happening with your documents today.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </Link>
      </div>

      {/* Row of 4 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Templates',
            value: totalTemplates,
            icon: <FileText className="w-5 h-5 text-primary" />,
            trend: `${totalTemplates > 0 ? 'Active' : 'Empty'}`,
            trendColor: 'text-primary bg-primary/10',
          },
          {
            title: 'Documents Generated',
            value: totalGenerated.toLocaleString(),
            icon: <Cpu className="w-5 h-5 text-success" />,
            trend: '▲ 12.4%',
            trendColor: 'text-success bg-success/10',
          },
          {
            title: 'This Month',
            value: thisMonthGenerated.toLocaleString(),
            icon: <Layers className="w-5 h-5 text-accent" />,
            trend: '▲ 8.1%',
            trendColor: 'text-accent bg-primary/10',
          },
          {
            title: 'Flagged Documents',
            value: totalFlagged.toLocaleString(),
            icon: <AlertTriangle className="w-5 h-5 text-warning" />,
            trend: `${totalFlagged > 0 ? 'Action required' : 'Clear'}`,
            trendColor: totalFlagged > 0 ? 'text-warning bg-warning/10' : 'text-success bg-success/10',
          },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-border p-6 rounded-card shadow-card flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{card.title}</span>
              <div className="p-2 rounded-lg bg-canvas border border-border">
                {card.icon}
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-text">{card.value}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.trendColor}`}>
                {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Templates Table Card */}
      <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-white">
          <div>
            <h3 className="text-base font-bold text-text">Recent Templates</h3>
            <p className="text-xs text-text-secondary mt-0.5">Quick access to your recently edited file designs.</p>
          </div>
          <Link
            href="/templates"
            className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto stroke-[1.5]" />
            <p className="text-sm text-text-secondary mt-3">No templates yet. Create your first one to get started!</p>
            <Link
              href="/templates/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn transition-all"
            >
              Upload Template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTemplates.map((temp) => (
              <div
                key={temp.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <Link
                      href={`/templates/${temp.id}/edit`}
                      className="font-semibold text-text hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{temp.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-text-secondary" />
                    </Link>
                    <span className="text-xs text-text-secondary">Edited {temp.timeLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Document count */}
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-text">{temp.docCount}</span>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">Generated</span>
                  </div>

                  {/* Fields count */}
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-text">{temp.template_fields?.length ?? 0}</span>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">Fields</span>
                  </div>

                  {/* Flagged Issue-count badge */}
                  <div className="w-24 flex justify-end">
                    {temp.flagCount > 0 ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-warning-bg text-warning border border-warning/20 rounded-full">
                        {temp.flagCount} flagged
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold bg-success-bg text-success border border-success/20 rounded-full">
                        Clean
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
