'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Play, Check, 
  HelpCircle, Settings, Edit, Eye, RotateCw 
} from 'lucide-react';
import type { Flag } from '@/lib/types';

interface FieldMeta {
  index: number;
  label: string;
}

export default function SingleRowReviewClient({
  batchId,
  rowIndex,
  csvData: initialCsvData,
  flags: initialFlags,
  pdfUrl: initialPdfUrl,
  templateFields,
  edited: initialEdited,
  flaggedCount,
  currentFlaggedNum,
  prevRowIndex,
  nextRowIndex,
}: {
  batchId: string;
  rowIndex: number;
  csvData: string[];
  flags: Flag[];
  pdfUrl: string | null;
  templateFields: FieldMeta[];
  edited: boolean;
  flaggedCount: number;
  currentFlaggedNum: number;
  prevRowIndex: number | null;
  nextRowIndex: number | null;
}) {
  const router = useRouter();
  const [csvData, setCsvData] = useState<string[]>(initialCsvData);
  const [flags, setFlags] = useState<Flag[]>(initialFlags);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl);
  const [edited, setEdited] = useState(initialEdited);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>(
    Object.fromEntries(initialCsvData.map((v, i) => [i, v]))
  );

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/batch/${batchId}/pdf/${rowIndex}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regeneration failed');
      
      setCsvData(data.csv_data);
      setFlags(data.flags);
      setPdfUrl(`${data.pdf_url}?t=${Date.now()}`); // Cache-bust URL
      setEdited(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setBusy(false);
    }
  };

  const handleFixOption = (option: string) => {
    if (option === 'ignore') {
      // Clear flags locally
      setFlags([]);
      alert("This issue will be ignored for this document.");
      return;
    }
    
    // For template editing fixes
    alert(
      `To resolve "${option}" permanently, you will need to open the Template Editor and modify the field settings. \n\nWe will redirect you back to the templates list so you can open the editor.`
    );
    router.push('/templates');
  };

  const getFlagLabel = (type: string) => {
    return type.replace('text_', '').replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-border p-4 rounded-card shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/batches/${batchId}`}
            className="p-2 hover:bg-muted text-text-secondary hover:text-text rounded-btn transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-text">Row {rowIndex + 1} of Batch</h1>
            <span className="text-xs text-text-secondary">
              Flagged Document {currentFlaggedNum} of {flaggedCount}
            </span>
          </div>
        </div>

        {/* Previous / Next pagination controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => prevRowIndex !== null && router.push(`/batches/${batchId}/review/${prevRowIndex}`)}
            disabled={prevRowIndex === null}
            className="px-3.5 py-2 border border-border-strong hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent font-semibold text-xs rounded-btn text-text flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={() => nextRowIndex !== null && router.push(`/batches/${batchId}/review/${nextRowIndex}`)}
            disabled={nextRowIndex === null}
            className="px-3.5 py-2 border border-border-strong hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent font-semibold text-xs rounded-btn text-text flex items-center gap-1.5 transition-all"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two pane editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane: PDF Render */}
        <div className="lg:col-span-7 bg-white border border-border rounded-card p-4 shadow-card flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Document Preview</span>
            {edited && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-success-bg text-success border border-success/20 rounded-full">
                Regenerated
              </span>
            )}
          </div>
          
          {pdfUrl ? (
            <iframe src={pdfUrl} className="pdf-frame min-h-[520px] rounded-lg shadow-inner" title={`Row ${rowIndex + 1}`} />
          ) : (
            <div className="py-24 text-center border border-dashed border-border bg-canvas rounded-lg text-text-secondary">
              PDF preview currently unavailable.
            </div>
          )}
        </div>

        {/* Right Pane: Issues, Edit, and Fix Options */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Issues List */}
          <div className="bg-white border border-border p-5 rounded-card shadow-card space-y-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider pb-2 border-b border-border">
              Detected Issues
            </h3>
            
            {flags.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-success-bg border border-success/20 rounded-btn text-success text-xs font-semibold">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Issues Resolved! No active overflows detected.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-error-bg/60 border border-error/20 text-text rounded-lg space-y-1"
                  >
                    <div className="flex items-center gap-2 text-error text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{getFlagLabel(flag.flag_type)}</span>
                    </div>
                    <span className="text-xs font-semibold block">{flag.field_label}</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{flag.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Form Fields to Edit */}
          <div className="bg-white border border-border p-5 rounded-card shadow-card space-y-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider pb-2 border-b border-border">
              Edit Field Values
            </h3>
            
            <div className="space-y-3.5">
              {templateFields.map((field) => (
                <div key={field.index}>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    {field.label} (col {field.index})
                  </label>
                  <input
                    type="text"
                    value={draft[field.index] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [field.index]: e.target.value })}
                    className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-sm rounded-btn bg-white text-text outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={save}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-sm rounded-btn shadow-sm transition-colors"
              >
                {busy ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    <span>Regenerating PDF...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Regenerate This Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Fix Options (stacked buttons) */}
          {flags.length > 0 && (
            <div className="bg-white border border-border p-5 rounded-card shadow-card space-y-3.5">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider pb-2 border-b border-border">
                Template Layout Fixes
              </h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                If the text fits poorly in general, click a quick fix to modify the layout for the entire template.
              </p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleFixOption('increase width')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold border border-border hover:bg-muted text-text rounded-btn transition-colors"
                >
                  Increase Field Box Width
                </button>
                <button
                  onClick={() => handleFixOption('allow wrap')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold border border-border hover:bg-muted text-text rounded-btn transition-colors"
                >
                  Enable Text Wrapping
                </button>
                <button
                  onClick={() => handleFixOption('reduce font size')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold border border-border hover:bg-muted text-text rounded-btn transition-colors"
                >
                  Adjust Font Size Bounds
                </button>
                <button
                  onClick={() => handleFixOption('ignore')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold border border-border-strong hover:bg-error-bg hover:text-error hover:border-error/20 text-text-secondary rounded-btn transition-colors"
                >
                  Ignore Issue for this Row
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Link
              href={`/batches/${batchId}`}
              className="px-5 py-2.5 border border-border-strong hover:bg-muted text-text font-semibold text-sm rounded-btn transition-colors"
            >
              Mark as Reviewed
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

// Simple fallback spinner icon
function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
