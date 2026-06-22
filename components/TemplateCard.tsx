'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  id: string;
  name: string;
  fieldCount: number;
  createdAt: string;
}

export default function TemplateCard({ id, name, fieldCount, createdAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else setBusy(false);
  };

  return (
    <div className="tcard">
      <h3>{name}</h3>
      <div className="meta">
        {fieldCount} field{fieldCount === 1 ? '' : 's'} · {new Date(createdAt).toLocaleDateString()}
      </div>
      <div className="actions">
        <Link className="btn" href={`/templates/${id}/edit`}>
          Edit
        </Link>
        <Link className="btn primary" href={`/generate?template=${id}`}>
          Generate
        </Link>
        <button className="danger" onClick={remove} disabled={busy}>
          {busy ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
