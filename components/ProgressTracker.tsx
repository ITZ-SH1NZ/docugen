'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Loader2, Sparkles } from 'lucide-react';
import type { ProgressUpdate } from '@/lib/types';

export default function ProgressTracker({
  batchId,
  initial,
}: {
  batchId: string;
  initial: ProgressUpdate;
}) {
  const router = useRouter();
  const [p, setP] = useState<ProgressUpdate>(initial);

  useEffect(() => {
    const es = new EventSource(`/api/batch/${batchId}/progress`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as ProgressUpdate;
      setP(data);
      if (data.status === 'completed' || data.status === 'failed') {
        es.close();
        router.refresh();
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [batchId, router]);

  // Circumference of SVG circle
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (p.progress / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Stepper */}
      <div className="lg:col-span-3 bg-white border border-border p-6 rounded-card shadow-card flex flex-col gap-6 shrink-0">
        <div className="text-xs uppercase font-bold text-text-secondary tracking-wider">Wizard Progress</div>
        <div className="flex flex-col gap-8 relative pl-4 border-l border-border">
          {[
            { s: 1, label: 'Select Template', desc: 'Choose base layout', done: true },
            { s: 2, label: 'Import Data', desc: 'Upload CSV rows', done: true },
            { s: 3, label: 'Map Fields', desc: 'Map columns to layout', done: true },
            { s: 4, label: 'Preview & Run', desc: 'Review fit & generate', done: true },
            { s: 5, label: 'Generate', desc: 'Running batch generation', active: true },
          ].map((item) => (
            <div key={item.s} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-[25px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  item.done
                    ? 'bg-success border-success text-white'
                    : item.active
                    ? 'bg-primary border-primary text-white ring-4 ring-primary/10'
                    : 'bg-white border-border text-text-secondary'
                }`}
              >
                {item.done ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : item.active ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  item.s
                )}
              </div>
              <div className="flex flex-col -translate-y-1">
                <span className={`text-sm font-semibold ${item.active ? 'text-primary font-bold' : 'text-text'}`}>
                  {item.label}
                </span>
                <span className="text-xs text-text-secondary">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Generation Progress */}
      <div className="lg:col-span-9 bg-white border border-border rounded-card shadow-card p-8 flex flex-col items-center justify-center min-h-[420px] text-center gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-text">Generating Documents</h3>
          <p className="text-sm text-text-secondary">Please don't close this window. Your documents are being compiled in-process.</p>
        </div>

        {/* CircularProgress */}
        <div className="relative flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            {/* Background Track */}
            <circle
              stroke="#F1F5F9"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress Fill */}
            <circle
              stroke="#2563EB"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-text">{p.progress}%</span>
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Progress</span>
          </div>
        </div>

        {/* Counts summary */}
        <div className="grid grid-cols-3 gap-6 max-w-md w-full border-t border-border pt-6 mt-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-secondary uppercase tracking-wider text-[10px]">Total Rows</span>
            <span className="text-xl font-bold text-text mt-1">{p.total_rows}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-secondary uppercase tracking-wider text-[10px]">Generated</span>
            <span className="text-xl font-bold text-text mt-1">{p.generated_count}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-secondary uppercase tracking-wider text-[10px]">Flagged</span>
            <span className="text-xl font-bold text-warning mt-1">{p.flagged_count}</span>
          </div>
        </div>

        {p.status === 'queued' && (
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary bg-canvas border border-border px-3.5 py-1.5 rounded-full mt-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Waiting for a worker to start processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
