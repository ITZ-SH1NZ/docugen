'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTemplate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a PDF file.');
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
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <h3>New template</h3>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <label>Name</label>
          <input
            value={name}
            placeholder="Certificate 2026"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label>PDF file</label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button className="primary" type="submit" disabled={busy} style={{ flex: '0 0 auto' }}>
          {busy ? 'Uploading…' : 'Upload & edit'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
