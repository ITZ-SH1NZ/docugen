'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, X, ArrowRight, ArrowLeft } from 'lucide-react';

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      if (!name) {
        setName(droppedFile.name.replace(/\.pdf$/i, ''));
      }
    } else {
      setError('Please drop a valid PDF file.');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop a PDF file first.');
      return;
    }
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.set('name', name || file.name.replace(/\.pdf$/i, ''));
    fd.set('pdf', file);

    try {
      const res = await fetch('/api/templates', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/templates/${data.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header and Back Link */}
      <div className="flex items-center gap-4">
        <Link href="/templates" className="p-2 hover:bg-white border border-transparent hover:border-border rounded-btn text-text-secondary hover:text-text transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Create Template</h1>
          <p className="text-sm text-text-secondary mt-1">Design a new document layout from a PDF base.</p>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="bg-white border border-border p-6 rounded-card shadow-card">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {[
            { step: 1, label: 'Upload', status: 'active' },
            { step: 2, label: 'Design', status: 'pending' },
            { step: 3, label: 'Fields', status: 'pending' },
            { step: 4, label: 'Save', status: 'pending' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    s.status === 'active'
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-muted text-text-secondary'
                  }`}
                >
                  {s.step}
                </div>
                <span className={`text-xs font-medium ${s.status === 'active' ? 'text-primary font-bold' : 'text-text-secondary'}`}>
                  {s.label}
                </span>
              </div>
              {i < 3 && (
                <div className="h-0.5 bg-border flex-1 mx-4 -translate-y-3"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Creation Card */}
      <div className="bg-white border border-border rounded-card shadow-card p-6 md:p-8">
        <form onSubmit={submit} className="space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Template Name
            </label>
            <input
              type="text"
              placeholder="e.g. Hackathon Certificate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3.5 py-2.5 text-sm rounded-btn bg-white text-text outline-none transition-all placeholder:text-text-muted"
            />
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Template File
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-card p-12 text-center cursor-pointer transition-all flex flex-col items-center gap-4 ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-canvas'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] ?? null;
                  setFile(selectedFile);
                  if (selectedFile && !name) {
                    setName(selectedFile.name.replace(/\.pdf$/i, ''));
                  }
                  setError(null);
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-semibold text-primary hover:underline">Click to browse</span> or drag and drop here
                <p className="text-xs text-text-secondary mt-1">Supports PDF base document (Max 50MB)</p>
              </div>
            </div>
          </div>

          {/* FileChip */}
          {file && (
            <div className="flex items-center justify-between p-3.5 border border-border bg-canvas rounded-card">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-primary-soft border border-primary/10 rounded-lg text-primary shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-sm font-semibold text-text truncate block">{file.name}</span>
                  <span className="text-xs text-text-secondary block">{formatSize(file.size)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-1.5 hover:bg-muted text-text-secondary hover:text-text rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && <div className="text-xs font-semibold text-error bg-error-bg border border-error/20 p-3 rounded-btn">{error}</div>}

          {/* Submit Action */}
          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={busy || !file}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-sm rounded-btn transition-colors shadow-sm"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <span>Upload & Design</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
