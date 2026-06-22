'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Search, Plus, Play, Trash2, Edit2, AlertCircle, CheckCircle, MoreVertical, Eye } from 'lucide-react';
import type { TemplateRecord } from '@/lib/types';

interface TemplateWithStats extends TemplateRecord {
  fieldCount: number;
  docCount: number;
  flagCount: number;
  timeLabel: string;
}

export default function TemplatesListClient({
  initialTemplates,
}: {
  initialTemplates: TemplateWithStats[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | issues | clean
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This will delete all associated batches and cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete template');
        setBusyId(null);
      }
    } catch (err) {
      alert('Error deleting template');
      setBusyId(null);
    }
  };

  // Filter templates
  const filteredTemplates = initialTemplates.filter((temp) => {
    const matchesSearch = temp.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'issues') return matchesSearch && temp.flagCount > 0;
    if (filter === 'clean') return matchesSearch && temp.flagCount === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title & header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Templates</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your document templates.</p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-btn outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Filter select */}
        <div className="w-full sm:w-48">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white border border-border px-3 py-2 text-sm rounded-btn outline-none focus:border-primary"
          >
            <option value="all">All Templates</option>
            <option value="issues">Has Issues</option>
            <option value="clean">Clean</option>
          </select>
        </div>
      </div>

      {/* Templates Table Card */}
      <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-16 h-16 text-text-muted mx-auto stroke-[1.2] mb-4" />
            <h3 className="text-lg font-bold text-text">No templates found</h3>
            <p className="text-sm text-text-secondary mt-1">
              {search || filter !== 'all' ? 'Try adjusting your search or filters.' : 'Upload a PDF to get started.'}
            </p>
            {!search && filter === 'all' && (
              <Link
                href="/templates/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn transition-all"
              >
                Upload Template
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-canvas border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Last Edited</th>
                  <th className="px-6 py-4 text-right">Documents</th>
                  <th className="px-6 py-4 text-center">Issues</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTemplates.map((temp) => (
                  <tr key={temp.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-soft border border-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-text block group-hover:text-primary transition-colors">
                            {temp.name}
                          </span>
                          <span className="text-xs text-text-secondary">{temp.fieldCount} fields mapped</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
                      {temp.timeLabel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-text">
                      {temp.docCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {temp.flagCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-bg text-warning">
                          <AlertCircle className="w-3 h-3" />
                          <span>{temp.flagCount} flagged</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success">
                          <CheckCircle className="w-3 h-3" />
                          <span>Clean</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/templates/${temp.id}/edit`}
                          className="p-1.5 hover:bg-muted text-text-secondary hover:text-text rounded-md transition-all"
                          title="Edit Layout"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/generate?template=${temp.id}`}
                          className="p-1.5 hover:bg-primary-soft text-text-secondary hover:text-primary rounded-md transition-all"
                          title="Generate Documents"
                        >
                          <Play className="w-4 h-4" />
                        </Link>
                        <button
                          disabled={busyId === temp.id}
                          onClick={() => remove(temp.id, temp.name)}
                          className="p-1.5 hover:bg-error-bg text-text-secondary hover:text-error rounded-md transition-all disabled:opacity-40"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
