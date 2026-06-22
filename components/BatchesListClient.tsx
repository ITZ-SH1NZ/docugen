'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Download, Eye, Layers, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { BatchRecord } from '@/lib/types';

interface BatchWithTemplate extends BatchRecord {
  templates?: {
    name: string;
  } | null;
}

export default function BatchesListClient({
  initialBatches,
}: {
  initialBatches: BatchWithTemplate[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | completed | processing | failed

  const filteredBatches = initialBatches.filter((b) => {
    const templateName = b.templates?.name || '';
    const matchesSearch = 
      b.id.toLowerCase().includes(search.toLowerCase()) || 
      templateName.toLowerCase().includes(search.toLowerCase());
      
    if (statusFilter === 'completed') return matchesSearch && b.status === 'completed';
    if (statusFilter === 'processing') return matchesSearch && (b.status === 'processing' || b.status === 'queued');
    if (statusFilter === 'failed') return matchesSearch && b.status === 'failed';
    return matchesSearch;
  });

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success border border-success/20">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'processing':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-bg text-info border border-info/20">
            <Clock className="w-3 h-3 animate-spin" />
            <span>{status === 'queued' ? 'Queued' : 'Processing'}</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error-bg text-error border border-error/20">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Generations</h1>
        <p className="text-sm text-text-secondary mt-1">Track all your document generation batches.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by template name or batch ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-btn outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-border px-3 py-2 text-sm rounded-btn outline-none focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="p-16 text-center">
            <Layers className="w-16 h-16 text-text-muted mx-auto stroke-[1.2] mb-4" />
            <h3 className="text-lg font-bold text-text">No generation runs found</h3>
            <p className="text-sm text-text-secondary mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or status filters.' : 'Run a template to generate batches.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-canvas border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Batch ID</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Documents</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-text-secondary">
                      {b.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-text">
                      {b.templates?.name || 'Deleted Template'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-text-secondary">
                      <span className="font-semibold text-text">{b.generated_count}</span>/{b.total_rows ?? '?'}
                      {b.flagged_count > 0 && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning">
                          {b.flagged_count} flagged
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusPill(b.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/batches/${b.id}`}
                          className="p-1.5 hover:bg-muted text-text-secondary hover:text-text rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </Link>
                        {b.status === 'completed' && (
                          <a
                            href={`/api/batch/${b.id}/download`}
                            className="p-1.5 hover:bg-primary-soft text-text-secondary hover:text-primary rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold"
                            title="Download ZIP"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </a>
                        )}
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
