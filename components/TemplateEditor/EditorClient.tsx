'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Play, Plus, Type, Image as ImageIcon, QrCode, 
  Barcode, Square, RotateCcw, ZoomIn, ZoomOut, Hand, Trash2, Check 
} from 'lucide-react';
import type { TemplateField, Alignment, TextTransform, RGB } from '@/lib/types';

const Canvas = dynamic(() => import('./Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[500px] text-text-secondary bg-white rounded-lg border border-border">
      <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></span>
      <span>Loading Canvas Editor…</span>
    </div>
  ),
});

let counter = 0;
const newId = () => `f_${Date.now()}_${counter++}`;

function makeField(index: number, pageWidth: number, pageHeight: number): TemplateField {
  const width = Math.min(280, pageWidth * 0.5);
  return {
    id: newId(),
    field_index: index,
    label: `Participant Name`,
    field_type: 'text',
    x: Math.max(20, pageWidth / 2 - width / 2),
    y: Math.min(180 + index * 60, pageHeight - 60),
    width,
    height: 40,
    max_font_size: 24,
    min_font_size: 8,
    font_family: 'Arial',
    font_weight: 'normal',
    alignment: 'center',
    color: [0, 0, 0],
    transform: 'none',
    wrap_text: true,
  };
}

const FONTS = ['Arial', 'Times', 'Courier', 'Playfair Display', 'Inter', 'Roboto', 'Montserrat', 'Lora'];
const ALIGN: Alignment[] = ['left', 'center', 'right'];
const TRANSFORMS: TextTransform[] = ['none', 'uppercase', 'lowercase', 'title_case'];

function rgbToHex([r, g, b]: RGB) {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function hexToRgb(hex: string): RGB {
  const m = hex.replace('#', '');
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

interface Props {
  templateId: string;
  templateName: string;
  pdfUrl: string;
  pageWidth: number;
  pageHeight: number;
  initialFields: TemplateField[];
}

export default function EditorClient({
  templateId,
  templateName,
  pdfUrl,
  pageWidth,
  pageHeight,
  initialFields,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<TemplateField[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(initialFields[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Right panel active tab: 'fields' | 'properties'
  const [activeTab, setActiveTab] = useState<'fields' | 'properties'>('properties');
  
  // Zoom state (for visual effect only)
  const [zoom, setZoom] = useState(100);

  const selected = fields.find((f) => f.id === selectedId);

  const addField = () => {
    const nextIndex = fields.reduce((m, f) => Math.max(m, f.field_index + 1), 0);
    const f = makeField(nextIndex, pageWidth, pageHeight);
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
    setSaved(false);
    setActiveTab('properties');
  };

  const updateField = (id: string, patch: Partial<TemplateField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setSaved(false);
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string) => {
    alert(message);
  };

  const columnCount = fields.reduce((m, f) => Math.max(m, f.field_index + 1), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-border p-4 rounded-card shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="p-2 hover:bg-muted text-text-secondary hover:text-text rounded-btn transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-text">{templateName}</h1>
            <span className="text-xs text-text-secondary">Horizontal creation step: Design Layout</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn transition-all text-text disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Design'}</span>
          </button>
          
          <Link
            href={`/generate?template=${templateId}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover font-semibold text-sm rounded-btn text-white transition-all shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Generate batch</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error-bg border border-error/20 text-error text-xs font-semibold p-3.5 rounded-btn shrink-0">
          {error}
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Tool Rail */}
        <div className="w-20 bg-white border border-border rounded-card shadow-sm flex flex-col items-center py-4 gap-2 shrink-0">
          <div className="text-[10px] uppercase font-bold text-text-muted mb-2 tracking-wider">Tools</div>
          
          <button
            onClick={addField}
            className="w-14 h-14 hover:bg-primary-soft text-text-secondary hover:text-primary flex flex-col items-center justify-center rounded-lg transition-all gap-1"
            title="Add text field"
          >
            <Type className="w-5 h-5" />
            <span className="text-[9px] font-medium">Text</span>
          </button>
          
          <button
            onClick={() => showToast('Image fields coming soon!')}
            className="w-14 h-14 hover:bg-primary-soft text-text-secondary hover:text-primary flex flex-col items-center justify-center rounded-lg transition-all gap-1 opacity-60"
            title="Add image (coming soon)"
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[9px] font-medium">Image</span>
          </button>
          
          <button
            onClick={() => showToast('QR Code fields coming soon!')}
            className="w-14 h-14 hover:bg-primary-soft text-text-secondary hover:text-primary flex flex-col items-center justify-center rounded-lg transition-all gap-1 opacity-60"
            title="Add QR code (coming soon)"
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[9px] font-medium">QR Code</span>
          </button>
          
          <button
            onClick={() => showToast('Barcode fields coming soon!')}
            className="w-14 h-14 hover:bg-primary-soft text-text-secondary hover:text-primary flex flex-col items-center justify-center rounded-lg transition-all gap-1 opacity-60"
            title="Add barcode (coming soon)"
          >
            <Barcode className="w-5 h-5" />
            <span className="text-[9px] font-medium">Barcode</span>
          </button>

          <button
            onClick={() => showToast('Rectangle decorations coming soon!')}
            className="w-14 h-14 hover:bg-primary-soft text-text-secondary hover:text-primary flex flex-col items-center justify-center rounded-lg transition-all gap-1 opacity-60"
            title="Add rectangle decoration (coming soon)"
          >
            <Square className="w-5 h-5" />
            <span className="text-[9px] font-medium">Rectangle</span>
          </button>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 bg-white border border-border rounded-card shadow-sm overflow-hidden flex flex-col relative min-w-0">
          <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-canvas">
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-150">
              <Canvas
                pdfUrl={pdfUrl}
                fields={fields}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id) setActiveTab('properties');
                }}
                onChange={updateField}
              />
            </div>
          </div>

          {/* Bottom-left Zoom Controls */}
          <div className="absolute bottom-4 left-4 bg-white/95 border border-border rounded-lg shadow-md p-1.5 flex items-center gap-1 backdrop-blur-sm z-10 text-xs">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 hover:bg-muted rounded-md text-text-secondary hover:text-text"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-text min-w-[40px] text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1 hover:bg-muted rounded-md text-text-secondary hover:text-text"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-muted rounded-md text-text-secondary hover:text-text"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 hover:bg-muted rounded-md text-text-secondary hover:text-text ml-0.5"
              title="Pan Tool"
            >
              <Hand className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Panel: Tabs */}
        <div className="w-80 bg-white border border-border rounded-card shadow-sm flex flex-col shrink-0 overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-border bg-canvas">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'properties'
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'fields'
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              Fields ({fields.length})
            </button>
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'fields' ? (
              <div className="space-y-2">
                {fields.length === 0 ? (
                  <p className="text-xs text-text-secondary text-center py-8">Add a text field from the tools rail to begin.</p>
                ) : (
                  fields.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedId(f.id);
                        setActiveTab('properties');
                      }}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                        f.id === selectedId
                          ? 'border-primary bg-primary-soft text-primary font-medium'
                          : 'border-border hover:bg-muted text-text-secondary hover:text-text'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-current rounded-md shrink-0">
                          {f.field_index}
                        </span>
                        <span className="text-sm truncate">{f.label || 'Untitled field'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(f.id);
                        }}
                        className="p-1 hover:bg-error-bg text-text-secondary hover:text-error rounded-md transition-colors"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Properties Tab */
              <div>
                {!selected ? (
                  <div className="text-center py-12 text-text-secondary space-y-2">
                    <SlidersIcon className="w-8 h-8 text-text-muted mx-auto stroke-[1.5]" />
                    <p className="text-sm font-medium text-text">No field selected</p>
                    <p className="text-xs">Click a box on the canvas or select a field from the list.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-xs font-bold text-text uppercase tracking-wider">Field {selected.field_index} Properties</span>
                      <button
                        onClick={() => deleteField(selected.id)}
                        className="text-xs font-bold text-error hover:text-error/85 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Field Label</label>
                        <input
                          type="text"
                          value={selected.label}
                          onChange={(e) => updateField(selected.id, { label: e.target.value })}
                          className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-sm rounded-btn bg-white text-text outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">CSV Column Mapping</label>
                        <select
                          value={selected.field_index}
                          onChange={(e) => updateField(selected.id, { field_index: Number(e.target.value) })}
                          className="w-full bg-white border border-border px-3 py-1.5 text-sm rounded-btn outline-none focus:border-primary"
                        >
                          {Array.from({ length: Math.max(columnCount, selected.field_index + 1) }, (_, i) => (
                            <option key={i} value={i}>
                              Column {i}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-text-muted mt-1 block">Column index in dynamic CSV data</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Font Family</label>
                        <select
                          value={selected.font_family}
                          onChange={(e) => updateField(selected.id, { font_family: e.target.value })}
                          className="w-full bg-white border border-border px-3 py-1.5 text-sm rounded-btn outline-none focus:border-primary font-sans"
                        >
                          {FONTS.map((font) => (
                            <option key={font} value={font}>
                              {font}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font weight and transform */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Font Weight</label>
                          <select
                            value={selected.font_weight}
                            onChange={(e) => updateField(selected.id, { font_weight: e.target.value })}
                            className="w-full bg-white border border-border px-3 py-1.5 text-sm rounded-btn outline-none focus:border-primary"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Transform</label>
                          <select
                            value={selected.transform}
                            onChange={(e) => updateField(selected.id, { transform: e.target.value as TextTransform })}
                            className="w-full bg-white border border-border px-3 py-1.5 text-sm rounded-btn outline-none focus:border-primary"
                          >
                            {TRANSFORMS.map((t) => (
                              <option key={t} value={t}>
                                {t.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Font Size Range (Min/Max) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Min Font (pt)</label>
                          <input
                            type="number"
                            min={1}
                            value={selected.min_font_size}
                            onChange={(e) => updateField(selected.id, { min_font_size: Number(e.target.value) || 1 })}
                            className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-sm rounded-btn bg-white text-text outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Max Font (pt)</label>
                          <input
                            type="number"
                            min={1}
                            value={selected.max_font_size}
                            onChange={(e) => updateField(selected.id, { max_font_size: Number(e.target.value) || 1 })}
                            className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-sm rounded-btn bg-white text-text outline-none"
                          />
                        </div>
                      </div>

                      {/* Alignment */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Text Alignment</label>
                        <div className="flex bg-canvas border border-border p-1 rounded-btn">
                          {ALIGN.map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateField(selected.id, { alignment: align })}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                                selected.alignment === align
                                  ? 'bg-white text-primary shadow-sm border border-border'
                                  : 'text-text-secondary hover:text-text'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Picker */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Font Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={rgbToHex(selected.color)}
                            onChange={(e) => updateField(selected.id, { color: hexToRgb(e.target.value) })}
                            className="w-10 h-10 border border-border rounded-lg cursor-pointer bg-white"
                          />
                          <input
                            type="text"
                            value={rgbToHex(selected.color).toUpperCase()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.match(/^#[0-9A-Fa-f]{6}$/)) {
                                updateField(selected.id, { color: hexToRgb(val) });
                              }
                            }}
                            className="w-28 border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-sm rounded-btn bg-white text-text outline-none text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* Checkbox: Wrap Text */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          id="wrap"
                          type="checkbox"
                          checked={selected.wrap_text}
                          onChange={(e) => updateField(selected.id, { wrap_text: e.target.checked })}
                          className="w-4 h-4 text-primary border-border focus:ring-primary rounded-md bg-white cursor-pointer"
                        />
                        <label htmlFor="wrap" className="text-sm font-semibold text-text-secondary cursor-pointer select-none">
                          Allow Text Wrapping
                        </label>
                      </div>

                      {/* Geometry Details */}
                      <div className="border-t border-border mt-4 pt-4 grid grid-cols-2 gap-2 text-[10px] text-text-secondary font-mono">
                        <div>X: {Math.round(selected.x)} pt</div>
                        <div>Y: {Math.round(selected.y)} pt</div>
                        <div>W: {Math.round(selected.width)} pt</div>
                        <div>H: {Math.round(selected.height)} pt</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple fallback sliders icon
function SlidersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="4" x1-="4" y1="21" y2="14" />
      <line x1="4" x1-="4" y1="10" y2="3" />
      <line x1="12" x1-="12" y1="21" y2="12" />
      <line x1="12" x1-="12" y1="8" y2="3" />
      <line x1="20" x1-="20" y1="21" y2="16" />
      <line x1="20" x1-="20" y1="12" y2="3" />
      <line x1="2" x1-="2" y1="14" y2="14" />
      <line x1="10" x1-="10" y1="8" y2="8" />
      <line x1="18" x1-="18" y1="16" y2="16" />
    </svg>
  );
}
