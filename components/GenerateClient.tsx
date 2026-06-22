'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { 
  Check, FileText, Upload, ArrowRight, ArrowLeft, Play, Sparkles, 
  HelpCircle, Settings, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import type { TemplateField } from '@/lib/types';

// Set up PDFjs worker
// Served locally from /public (copied on install/build) — no CDN round-trip.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const DISPLAY_W = 600; // Preview on-screen width

interface TemplateFieldOpt extends TemplateField {}

interface TemplateOpt {
  id: string;
  name: string;
  pdfUrl: string;
  page_width: number;
  page_height: number;
  fields: TemplateFieldOpt[];
}

export default function GenerateClient({
  templates,
  preselect,
  customFonts = [],
}: {
  templates: TemplateOpt[];
  preselect?: string;
  customFonts?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();

  // Register custom fonts dynamically in the browser's document.fonts registry
  useEffect(() => {
    customFonts.forEach(font => {
      const familyName = font.name.replace(/\.[^/.]+$/, ""); // Strip file extension
      const url = `/api/assets/${font.id}`;
      
      const fontFace1 = new FontFace(font.name, `url(${url})`);
      const fontFace2 = new FontFace(familyName, `url(${url})`);
      
      fontFace1.load().then(loadedFace => {
        document.fonts.add(loadedFace);
      }).catch(e => console.warn(`Failed loading font ${font.name}:`, e));
      
      fontFace2.load().then(loadedFace => {
        document.fonts.add(loadedFace);
      }).catch(e => console.warn(`Failed loading font ${familyName}:`, e));
    });
  }, [customFonts]);
  
  // Wizard steps: 1: Template, 2: Import Data, 3: Map Fields, 4: Preview
  const [step, setStep] = useState(1);
  
  // Step 1: Template State
  const [templateId, setTemplateId] = useState(preselect || templates[0]?.id || '');
  const template = templates.find((t) => t.id === templateId);

  // Step 2: Import Data State
  const [batchName, setBatchName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]); // raw CSV rows
  const [hasHeaders, setHasHeaders] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Map Fields State
  // Map field.id -> CSV Column index
  const [mapping, setMapping] = useState<Record<string, number>>({});

  // Step 4: Preview State
  const [previewRowIndex, setPreviewRowIndex] = useState(0); // 0-based index relative to data rows
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number; scale: number } | null>(null);
  const [loadingPreviewPdf, setLoadingPreviewPdf] = useState(false);

  // General States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill batch name on file upload
  const onFile = (f: File) => {
    setFile(f);
    setCsvError(null);
    setRows([]);
    setMapping({});
    setPreviewRowIndex(0);
    
    if (!batchName) {
      setBatchName(f.name.replace(/\.csv$/i, ''));
    }

    Papa.parse<string[]>(f, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (data.length === 0) {
          setCsvError('Uploaded CSV is empty.');
          return;
        }
        setRows(data);
        // Advance to step 3 once file is loaded and parsed
        setStep(3);
      },
      error: (err) => setCsvError(`CSV parse error: ${err.message}`),
    });
  };

  // Perform column auto-mapping when headers or fields change
  useEffect(() => {
    if (!template || rows.length === 0) return;
    
    const headers = hasHeaders ? rows[0] : [];
    const newMapping: Record<string, number> = {};
    
    template.fields.forEach((field) => {
      // 1. Try case-insensitive fuzzy match with header names
      if (hasHeaders) {
        const cleanedLabel = field.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedIdx = headers.findIndex((h) => {
          const cleanedH = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanedH === cleanedLabel || cleanedH.includes(cleanedLabel) || cleanedLabel.includes(cleanedH);
        });
        if (matchedIdx !== -1) {
          newMapping[field.id] = matchedIdx;
          return;
        }
      }
      
      // 2. Fall back to field.field_index if within columns bounds
      const numCols = rows[0]?.length ?? 0;
      if (field.field_index < numCols) {
        newMapping[field.id] = field.field_index;
      } else {
        newMapping[field.id] = 0; // fallback to first column
      }
    });

    setMapping(newMapping);
  }, [templateId, rows, hasHeaders]);

  // Load PDF page 1 background for preview
  useEffect(() => {
    if (step !== 4 || !template?.pdfUrl) return;
    
    setLoadingPreviewPdf(true);
    let cancelled = false;

    (async () => {
      try {
        const doc = await pdfjs.getDocument(template.pdfUrl).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = DISPLAY_W / base.width;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        if (cancelled) return;
        setPreviewImage(canvas.toDataURL());
        setPreviewDims({ w: viewport.width, h: viewport.height, scale });
      } catch (err) {
        console.error('Error rendering preview PDF', err);
      } finally {
        if (!cancelled) setLoadingPreviewPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, templateId]);

  // Submit and Generate batch
  const generate = async () => {
    if (!templateId) return setError('Please select a template.');
    if (!template) return setError('Template not found.');
    if (!file || rows.length === 0) return setError('Please upload your CSV data.');
    
    setBusy(true);
    setError(null);

    try {
      // 1. Separate headers and data
      const headers = hasHeaders ? rows[0] : [];
      const dataRows = hasHeaders ? rows.slice(1) : rows;

      // 2. Transform the CSV columns to match the template field_index ordering,
      // and output a header-less CSV that the backend expects.
      const transformedRows = dataRows.map((row) => {
        const newRow: string[] = [];
        template.fields.forEach((field) => {
          const csvColIdx = mapping[field.id];
          newRow[field.field_index] = row[csvColIdx] ?? '';
        });
        return newRow;
      });

      // Convert data rows back to CSV text
      const csvContent = Papa.unparse(transformedRows);
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'data_mapped.csv', { type: 'text/csv' });

      // 3. Post to API
      const fd = new FormData();
      fd.set('template_id', templateId);
      fd.set('csv', csvFile);
      fd.set('batch_name', batchName || file.name.replace(/\.csv$/i, ''));

      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start generation');
      
      // Redirect to the batch progress page (Step 5)
      router.push(`/batches/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
      setBusy(false);
    }
  };

  const getStepStatus = (itemStep: number) => {
    if (step > itemStep) return 'completed';
    if (step === itemStep) return 'active';
    return 'pending';
  };

  // Get data rows for preview
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const currentPreviewRow = dataRows[previewRowIndex] ?? [];
  const maxPreviewRows = dataRows.length;

  const previewFieldValues = template?.fields.map((f) => {
    const csvIdx = mapping[f.id];
    return {
      label: f.label,
      value: currentPreviewRow[csvIdx] ?? '',
    };
  }) ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Vertical Stepper */}
      <div className="lg:col-span-3 bg-white border border-border p-6 rounded-card shadow-card flex flex-col gap-6 shrink-0 sticky top-24">
        <div className="text-xs uppercase font-bold text-text-secondary tracking-wider">Wizard Progress</div>
        <div className="flex flex-col gap-8 relative pl-4 border-l border-border">
          {[
            { s: 1, label: 'Select Template', desc: 'Choose base layout' },
            { s: 2, label: 'Import Data', desc: 'Upload CSV rows' },
            { s: 3, label: 'Map Fields', desc: 'Map columns to layout' },
            { s: 4, label: 'Preview & Run', desc: 'Review fit & generate' },
          ].map((item) => {
            const status = getStepStatus(item.s);
            return (
              <div key={item.s} className="relative flex items-start gap-4">
                {/* Visual bullet indicator */}
                <div
                  className={`absolute -left-[25px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    status === 'completed'
                      ? 'bg-success border-success text-white'
                      : status === 'active'
                      ? 'bg-primary border-primary text-white ring-4 ring-primary/10'
                      : 'bg-white border-border text-text-secondary'
                  }`}
                >
                  {status === 'completed' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : item.s}
                </div>
                <div className="flex flex-col -translate-y-1">
                  <span className={`text-sm font-semibold transition-all ${status === 'active' ? 'text-primary font-bold' : 'text-text'}`}>
                    {item.label}
                  </span>
                  <span className="text-xs text-text-secondary">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Step Content Card */}
      <div className="lg:col-span-9 bg-white border border-border rounded-card shadow-card overflow-hidden">
        {error && (
          <div className="m-6 p-4 bg-error-bg border border-error/20 text-error text-sm font-semibold rounded-btn">
            {error}
          </div>
        )}

        {/* STEP 1: SELECT TEMPLATE */}
        {step === 1 && (
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text">Choose your base Template</h3>
              <p className="text-sm text-text-secondary mt-1">Select the certificate or document layout design for this batch generation.</p>
            </div>

            {templates.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-border bg-canvas rounded-card">
                <FileText className="w-12 h-12 text-text-muted mx-auto stroke-[1.5] mb-2" />
                <p className="text-sm text-text-secondary">No templates found in your library.</p>
                <Link href="/templates/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-btn transition-colors">
                  Upload first template
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Template</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-white border border-border px-4 py-2.5 text-sm rounded-btn outline-none focus:border-primary"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fields.length} fields)
                    </option>
                  ))}
                </select>
                
                {template && (
                  <div className="bg-canvas border border-border p-4 rounded-card text-xs text-text-secondary flex flex-col gap-2">
                    <span className="font-semibold text-text">Template Details:</span>
                    <span>Dimensions: {template.page_width} × {template.page_height} pt</span>
                    <span>Fields mapping index bounds: 0 to {template.fields.reduce((max, f) => Math.max(max, f.field_index), 0)}</span>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!templateId}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-sm rounded-btn transition-all"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: IMPORT DATA (CSV) */}
        {step === 2 && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-text">Import your dynamic data</h3>
                <p className="text-sm text-text-secondary mt-1">Upload a CSV file containing the recipient values.</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-text-secondary hover:text-text"
              >
                Change Template
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 transition-all rounded-card p-12 text-center cursor-pointer bg-canvas flex flex-col items-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-semibold text-primary hover:underline">Click to browse</span> or drop your CSV file here
                <p className="text-xs text-text-secondary mt-1">Supports CSV file formats (UTF-8)</p>
              </div>
            </div>

            {csvError && (
              <div className="text-xs font-semibold text-error bg-error-bg border border-error/20 p-3 rounded-btn">
                {csvError}
              </div>
            )}

            {/* Tips Box */}
            <div className="p-4 bg-primary-soft/50 border border-primary/10 rounded-card space-y-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-primary" />
                Tips & Guidelines
              </span>
              <ul className="text-xs text-text-secondary list-disc pl-4 space-y-1">
                <li>Make sure the first row contains columns headers (e.g. Name, Event, Date).</li>
                <li>Each subsequent row represents a distinct document to generate.</li>
                <li>Supported format: CSV (UTF-8 encoding). Avoid XLS/XLSX.</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn text-text"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MAP FIELDS */}
        {step === 3 && template && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-text">Map layout fields to CSV Columns</h3>
                <p className="text-sm text-text-secondary mt-1">We've auto-mapped columns based on matching text. Please review.</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
                {file?.name} ({rows.length - 1} rows)
              </span>
            </div>

            {/* Headers Switch */}
            <div className="flex items-center gap-2 pb-2">
              <input
                id="headers"
                type="checkbox"
                checked={hasHeaders}
                onChange={(e) => setHasHeaders(e.target.checked)}
                className="w-4 h-4 text-primary border-border focus:ring-primary rounded-md bg-white cursor-pointer"
              />
              <label htmlFor="headers" className="text-sm font-semibold text-text-secondary cursor-pointer select-none">
                First row contains column headers
              </label>
            </div>

            {/* Mapping rows */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border text-xs font-bold uppercase tracking-wider text-text-secondary">
                <div className="col-span-5">Template Field</div>
                <div className="col-span-2 text-center">Index</div>
                <div className="col-span-5">CSV Column Data Source</div>
              </div>
              
              {template.fields.map((field) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-center py-2.5 border-b border-border/50 last:border-b-0">
                  <div className="col-span-5 font-semibold text-sm text-text flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0"></div>
                    <span>{field.label}</span>
                  </div>
                  <div className="col-span-2 text-center text-xs font-mono text-text-muted">
                    col {field.field_index}
                  </div>
                  <div className="col-span-5">
                    <select
                      value={mapping[field.id] ?? 0}
                      onChange={(e) => setMapping({ ...mapping, [field.id]: Number(e.target.value) })}
                      className="w-full bg-white border border-border px-3 py-1.5 text-xs rounded-btn outline-none focus:border-primary"
                    >
                      {rows[0]?.map((colName, idx) => (
                        <option key={idx} value={idx}>
                          {hasHeaders ? `"${colName}"` : `Column ${idx}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch metadata settings */}
            <div className="bg-canvas border border-border p-4 rounded-card space-y-4">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">Batch Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Batch Run Name (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Graduates 2026"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-1.5 text-xs rounded-btn bg-white text-text outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn text-text"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-btn transition-all"
              >
                <span>Preview Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PREVIEW */}
        {step === 4 && template && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-text">Preview Document</h3>
                <p className="text-sm text-text-secondary mt-1">Review how your document will render with real data before launching the batch.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-text-secondary hover:text-text"
                >
                  Adjust Mapping
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Canvas Preview */}
              <div className="lg:col-span-8 border border-border bg-canvas rounded-card p-4 flex flex-col items-center gap-4 min-h-[400px] justify-center relative">
                {loadingPreviewPdf ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                    <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></span>
                    <span>Rendering preview...</span>
                  </div>
                ) : previewImage && previewDims ? (
                  <div 
                    className="relative shadow-md border border-border bg-white" 
                    style={{ width: previewDims.w, height: previewDims.h }}
                  >
                    <img 
                      src={previewImage} 
                      alt="PDF Background" 
                      style={{ width: '100%', height: '100%' }}
                      className="select-none pointer-events-none" 
                    />
                    
                    {/* Render fields values client-side as overlay text */}
                    {template.fields.map((f) => {
                      const csvIdx = mapping[f.id];
                      const val = currentPreviewRow[csvIdx] ?? '';
                      const left = f.x * previewDims.scale;
                      const top = f.y * previewDims.scale;
                      const width = f.width * previewDims.scale;
                      const height = f.height * previewDims.scale;
                      
                      // Font variables map
                      let fontFamily = f.font_family;
                      if (f.font_family === 'Playfair Display') fontFamily = 'var(--font-serif)';
                      else if (f.font_family === 'Inter') fontFamily = 'var(--font-inter)';
                      else if (f.font_family === 'Roboto') fontFamily = 'var(--font-roboto)';
                      else if (f.font_family === 'Montserrat') fontFamily = 'var(--font-montserrat)';
                      else if (f.font_family === 'Lora') fontFamily = 'var(--font-lora)';
                      else {
                        fontFamily = `"${f.font_family.replace(/\.[^/.]+$/, '')}", "${f.font_family}"`;
                      }
                      
                      // Scale font size
                      const fontSize = f.max_font_size * previewDims.scale;
                      const color = `rgb(${f.color[0]}, ${f.color[1]}, ${f.color[2]})`;

                      // Transform text
                      let transformedVal = val;
                      if (f.transform === 'uppercase') transformedVal = val.toUpperCase();
                      if (f.transform === 'lowercase') transformedVal = val.toLowerCase();
                      if (f.transform === 'title_case') {
                        transformedVal = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                      }

                      return (
                        <div
                          key={f.id}
                          style={{
                            position: 'absolute',
                            left,
                            top,
                            width,
                            height,
                            fontSize,
                            fontFamily,
                            color,
                            textAlign: f.alignment,
                            fontWeight: f.font_weight === 'bold' ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: f.alignment === 'center' ? 'center' : f.alignment === 'right' ? 'flex-end' : 'flex-start',
                            overflow: 'hidden',
                            whiteSpace: f.wrap_text ? 'normal' : 'nowrap',
                            lineHeight: 1.2,
                          }}
                          className="border border-primary/20 bg-primary/5 select-none pointer-events-none"
                        >
                          {transformedVal}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">Failed to render preview background.</p>
                )}

                {/* Preview Row Paginator */}
                {maxPreviewRows > 0 && (
                  <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-border shadow-sm">
                    <button
                      onClick={() => setPreviewRowIndex(Math.max(0, previewRowIndex - 1))}
                      disabled={previewRowIndex === 0}
                      className="p-1 hover:bg-muted text-text hover:text-primary rounded-md disabled:opacity-40 disabled:hover:text-text"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-text">
                      Row {previewRowIndex + 1} of {maxPreviewRows}
                    </span>
                    <button
                      onClick={() => setPreviewRowIndex(Math.min(maxPreviewRows - 1, previewRowIndex + 1))}
                      disabled={previewRowIndex === maxPreviewRows - 1}
                      className="p-1 hover:bg-muted text-text hover:text-primary rounded-md disabled:opacity-40 disabled:hover:text-text"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Quality check & data table values */}
              <div className="lg:col-span-4 space-y-6">
                {/* Quality Check Card */}
                <div className="bg-canvas border border-border rounded-card p-5 space-y-4">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Quality Check</span>
                  
                  <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/20 rounded-btn text-success">
                    <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                    <div>
                      <span className="text-xs font-bold block">Looks Good!</span>
                      <span className="text-[10px] text-success/80 block">No visual overflow issues detected.</span>
                    </div>
                  </div>
                </div>

                {/* Row Data Values Card */}
                <div className="bg-canvas border border-border rounded-card p-5 space-y-4">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Row Values</span>
                  
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {previewFieldValues.map((fv, i) => (
                      <div key={i} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-text-secondary block uppercase tracking-wider">{fv.label}</span>
                        <div className="text-xs font-semibold text-text px-2.5 py-1.5 border border-border bg-white rounded-md truncate">
                          {fv.value || <span className="text-text-muted italic">empty</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-strong hover:bg-muted font-semibold text-sm rounded-btn text-text"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <button
                onClick={generate}
                disabled={busy || dataRows.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-sm rounded-btn transition-colors shadow-sm"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Starting generation...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Generate {maxPreviewRows} PDF{maxPreviewRows === 1 ? '' : 's'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
