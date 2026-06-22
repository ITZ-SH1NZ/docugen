'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Check, Download, AlertTriangle, Play, HelpCircle, AlertCircle, 
  CheckCircle, ArrowUpRight, Eye, ChevronRight, FileDown 
} from 'lucide-react';
import type { Flag } from '@/lib/types';

interface FlaggedRow {
  row_index: number;
  csv_data: string[];
  flags: Flag[];
  pdf_url: string | null;
  edited: boolean;
}

interface FieldMeta {
  index: number;
  label: string;
}

export default function ReviewClient({
  batchId,
  generatedCount,
  flaggedCount,
  templateFields,
  flagged,
}: {
  batchId: string;
  generatedCount: number;
  flaggedCount: number;
  templateFields: FieldMeta[];
  flagged: FlaggedRow[];
}) {
  // Count specific warning types across flagged rows
  let shrunkCount = 0;
  let wrappedCount = 0;
  let truncatedCount = 0;

  flagged.forEach((row) => {
    let hasShrunk = false;
    let hasWrapped = false;
    let hasTruncated = false;

    row.flags.forEach((f) => {
      if (f.flag_type === 'text_shrunk') hasShrunk = true;
      if (f.flag_type === 'text_wrapped') hasWrapped = true;
      if (f.flag_type === 'text_truncated') hasTruncated = true;
    });

    if (hasShrunk) shrunkCount++;
    if (hasWrapped) wrappedCount++;
    if (hasTruncated) truncatedCount++;
  });

  const successfulCount = generatedCount - flaggedCount;

  // Render Issue badge styling
  const getFlagBadge = (flagType: string) => {
    switch (flagType) {
      case 'text_shrunk':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-warning-bg text-warning border border-warning/10 rounded-full">
            shrunk
          </span>
        );
      case 'text_wrapped':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-info-bg text-info border border-info/20 rounded-full">
            wrapped
          </span>
        );
      case 'text_truncated':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-error-bg text-error border border-error/20 rounded-full">
            truncated
          </span>
        );
    }
  };

  const handleDownloadReport = () => {
    // Generate a quick client-side CSV report download
    const reportData = flagged.map(row => ({
      Row: row.row_index + 1,
      Issues: row.flags.map(f => `${f.field_label}: ${f.details}`).join('; '),
      Data: row.csv_data.join(' | ')
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Row,Issues,CSV Data", ...reportData.map(r => `"${r.Row}","${r.Issues.replace(/"/g, '""')}","${r.Data.replace(/"/g, '""')}"`)].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `batch_${batchId.slice(0, 8)}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header Notification banner */}
      <div className="p-5 bg-success-bg border border-success/20 rounded-card flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text">Generation Complete! 🎉</h2>
          <p className="text-sm text-text-secondary mt-0.5">Your documents have been successfully generated. Please review flagged issues below.</p>
        </div>
      </div>

      {/* Row of 4 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-border p-5 rounded-card shadow-card flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Generated</span>
          <span className="text-2xl font-bold text-text mt-2">{generatedCount}</span>
        </div>
        <div className="bg-white border border-border p-5 rounded-card shadow-card flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Successful</span>
          <span className="text-2xl font-bold text-success mt-2">{successfulCount}</span>
        </div>
        <div className="bg-white border border-border p-5 rounded-card shadow-card flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Warnings</span>
          <span className="text-2xl font-bold text-warning mt-2">{flaggedCount}</span>
        </div>
        <div className="bg-white border border-border p-5 rounded-card shadow-card flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-error uppercase tracking-wider">Errors</span>
          <span className="text-2xl font-bold text-error mt-2">0</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
        <a
          href={`/api/batch/${batchId}/pdf`}
          target="_blank"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover font-semibold text-sm rounded-btn text-white transition-all shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          <span>Download Merged PDF (Fast, 1.8MB)</span>
        </a>
        <a
          href={`/api/batch/${batchId}/download`}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn text-text transition-all"
        >
          <Download className="w-4 h-4 text-text-secondary" />
          <span>Download ZIP (Slow, 180MB)</span>
        </a>
        <button
          onClick={handleDownloadReport}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn text-text transition-all"
        >
          <FileDown className="w-4 h-4 text-text-secondary" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Two columns: Issue Summary and Flagged table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Issue Summary Left */}
        <div className="lg:col-span-4 bg-white border border-border p-6 rounded-card shadow-card space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-xs font-bold text-text uppercase tracking-wider">Issue Summary</span>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between p-3 bg-warning-bg/40 border border-warning/10 rounded-lg text-warning">
              <span className="font-semibold">Text Shrunk</span>
              <span className="font-bold">{shrunkCount} documents</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-info-bg/40 border border-info/20 rounded-lg text-info">
              <span className="font-semibold">Text Wrapped</span>
              <span className="font-bold">{wrappedCount} documents</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-error-bg/40 border border-error/20 rounded-lg text-error">
              <span className="font-semibold">Text Truncated</span>
              <span className="font-bold">{truncatedCount} documents</span>
            </div>
          </div>
        </div>

        {/* Flagged rows list Right */}
        <div className="lg:col-span-8 bg-white border border-border rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-white">
            <h3 className="text-base font-bold text-text">Flagged for Review ({flagged.length})</h3>
            <p className="text-xs text-text-secondary mt-0.5">Below are rows where text modifications or wrapping occurred.</p>
          </div>

          {flagged.length === 0 ? (
            <div className="p-12 text-center text-text-secondary">
              <CheckCircle className="w-10 h-10 text-success mx-auto stroke-[1.5] mb-2" />
              <p className="text-sm font-semibold text-text">Clean run!</p>
              <p className="text-xs">No issues flagged. Every document fit perfectly inside the designated fields.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {flagged.map((row) => (
                <div
                  key={row.row_index}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1 overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">Row {row.row_index + 1}</span>
                      {row.edited && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-success-bg text-success border border-success/20 rounded-full">
                          edited
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary truncate block">
                      {row.csv_data.slice(0, 3).join('  ·  ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                    {/* List of flags */}
                    <div className="flex gap-1.5 flex-wrap">
                      {row.flags.map((f, i) => (
                        <div key={i} title={f.details}>
                          {getFlagBadge(f.flag_type)}
                        </div>
                      ))}
                    </div>

                    <Link
                      href={`/batches/${batchId}/review/${row.row_index}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover shrink-0 transition-colors"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
