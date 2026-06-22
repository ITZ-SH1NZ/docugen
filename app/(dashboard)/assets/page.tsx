import { FolderOpen, UploadCloud, Search, Image as ImageIcon, Type, Award } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AssetsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Assets</h1>
        <p className="text-sm text-text-secondary mt-1">Manage shared assets like images, custom fonts, and seals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload */}
        <div className="lg:col-span-4 bg-white border border-border p-6 rounded-card shadow-card">
          <h3 className="text-base font-bold text-text mb-4">Upload Asset</h3>
          <div className="border border-dashed border-border-strong hover:border-primary/50 transition-all rounded-card p-8 text-center cursor-pointer bg-canvas flex flex-col items-center gap-3">
            <UploadCloud className="w-10 h-10 text-text-secondary stroke-[1.5]" />
            <div>
              <span className="text-sm font-semibold text-primary hover:underline">Click to upload</span>
              <p className="text-[10px] text-text-secondary mt-1">Supports PNG, JPG, TTF, OTF (Max 10MB)</p>
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-8 bg-white border border-border rounded-card shadow-card">
          <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base font-bold text-text">Your Library</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search assets..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-canvas border border-border rounded-btn outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="p-6 divide-y divide-border">
            {[
              { name: 'logo_black.png', type: 'Image', size: '240 KB', icon: <ImageIcon className="w-4 h-4 text-primary" /> },
              { name: 'PlayfairDisplay-Bold.ttf', type: 'Font', size: '1.2 MB', icon: <Type className="w-4 h-4 text-primary" /> },
              { name: 'gold_seal.png', type: 'Image', size: '180 KB', icon: <Award className="w-4 h-4 text-primary" /> },
            ].map((asset, i) => (
              <div key={i} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-soft border border-primary/10 rounded-lg">
                    {asset.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-text block">{asset.name}</span>
                    <span className="text-xs text-text-secondary">{asset.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary">
                  <span>{asset.size}</span>
                  <button className="text-primary hover:text-primary-hover">View</button>
                  <button className="text-error hover:text-error/80">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
