'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  UploadCloud,
  Search,
  Image as ImageIcon,
  Type,
  Award,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: 'font' | 'image';
  size_bytes: number;
  created_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'font' | 'image'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to load assets');
      const data = await res.json();
      setAssets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assets library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleUpload = async (file: File) => {
    const filename = file.name.toLowerCase();
    const isFont = filename.endsWith('.ttf') || filename.endsWith('.otf') || filename.endsWith('.woff2') || filename.endsWith('.woff');
    const isImage = filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.webp');

    if (!isFont && !isImage) {
      setError('Unsupported file type. Please upload custom fonts (.ttf, .otf, .woff2) or images (.png, .jpg, .webp).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Maximum size allowed is 10MB.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload asset.');
      }

      setSuccessMsg(`Successfully uploaded "${file.name}"!`);
      setAssets((prev) => [data, ...prev]);
      
      // Auto clear success message
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      setError(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete asset.');
      }

      setAssets((prev) => prev.filter((a) => a.id !== id));
      setSuccessMsg(`Successfully deleted "${name}".`);
      
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete asset.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filtered Assets list
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Assets & Fonts</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage custom fonts (.ttf, .otf) and images to use inside templates and generators.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-error-bg border border-error/20 rounded-card flex gap-3 items-start text-sm text-error">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error</span>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-success-bg border border-success/20 rounded-card flex gap-3 items-start text-sm text-success">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload */}
        <div className="lg:col-span-4 bg-white border border-border p-6 rounded-card shadow-card space-y-4">
          <h3 className="text-base font-bold text-text">Upload Asset</h3>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".ttf,.otf,.woff,.woff2,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border-strong hover:border-primary/50 transition-all rounded-card p-10 text-center cursor-pointer bg-canvas flex flex-col items-center justify-center gap-4 min-h-[220px] ${
              uploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {uploading ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : (
              <UploadCloud className="w-12 h-12 text-text-secondary stroke-[1.5]" />
            )}
            
            <div>
              <span className="text-sm font-bold text-primary hover:underline">
                {uploading ? 'Uploading your asset...' : 'Click to select asset file'}
              </span>
              <p className="text-xs text-text-secondary mt-2 max-w-[200px] mx-auto">
                Supports Custom Fonts (TTF, OTF, WOFF2) and Images (PNG, JPG, WEBP) up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-8 bg-white border border-border rounded-card shadow-card flex flex-col min-h-[400px]">
          {/* List Headers / Controls */}
          <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                  filterType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-text-secondary hover:bg-border/30'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('font')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                  filterType === 'font'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-text-secondary hover:bg-border/30'
                }`}
              >
                Fonts
              </button>
              <button
                onClick={() => setFilterType('image')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                  filterType === 'image'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-text-secondary hover:bg-border/30'
                }`}
              >
                Images
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-canvas border border-border rounded-btn outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 p-6 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-text-secondary mt-3">Loading asset library...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-16 h-16 text-text-muted stroke-[1.2] mb-4" />
                <h4 className="font-bold text-text">Library is empty</h4>
                <p className="text-sm text-text-secondary max-w-sm mt-1">
                  {searchQuery || filterType !== 'all'
                    ? 'No assets match your search filters.'
                    : 'Upload custom fonts or brand image signatures in the left panel.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredAssets.map((asset) => (
                  <div key={asset.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0 group">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 bg-primary-soft border border-primary/10 rounded-lg shrink-0">
                        {asset.type === 'font' ? (
                          <Type className="w-5 h-5 text-primary stroke-[1.5]" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-primary stroke-[1.5]" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-text block max-w-xs sm:max-w-md truncate">
                          {asset.name}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary mt-0.5 block">
                          {asset.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary shrink-0">
                      <span>{formatSize(asset.size_bytes)}</span>
                      <button
                        onClick={() => handleDelete(asset.id, asset.name)}
                        className="p-1.5 text-text-secondary hover:text-error hover:bg-error-bg rounded-btn transition-all"
                        title="Delete asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
