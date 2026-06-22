# Document Automation Platform - Complete Web Application

## Overview

Build a full-stack document automation web platform where users can:

1. Upload PDF templates
2. Visually define dynamic fields (drag-drop on canvas)
3. Upload CSV data
4. Generate 100s of personalized PDFs
5. Review flagged documents
6. Manually edit individual PDFs
7. Download results

**Stack:**
- Frontend: Next.js (App Router) + Canvas editor
- Backend: Node.js + Express
- PDF Engine: C binary (document_generator)
- Database: Supabase (PostgreSQL)
- Storage: Supabase Storage (S3-compatible)
- Real-time: WebSockets or Server-Sent Events (SSE)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  (Template Editor + CSV Upload + Progress + Review)     │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────────────┐
│                 Express Backend API                      │
│ (Job Management, File Handling, Auth)                   │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    Supabase   Bull Queue   C Engine
    (DB+Auth)  (Redis)      Binary
        │          │          │
        │          │          ▼
        │          └────▶ PDFs + Metadata
        │
        ▼
    Supabase Storage
    (PDFs, CSVs, Templates)
```

---

## Part 1: Database Schema (Supabase PostgreSQL)

```sql
-- Users (via Supabase Auth)
-- Already managed by Supabase Auth, no custom table needed

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pdf_original_url TEXT,  -- URL to original template PDF in storage
  pdf_storage_path TEXT,  -- Path in Supabase Storage
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1,
  UNIQUE(user_id, name)
);

-- Template Fields
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  field_index INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) DEFAULT 'text',  -- 'text', 'qr_code', 'image', 'barcode'
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  max_font_size INT,
  min_font_size INT,
  font_family VARCHAR(64),
  font_weight VARCHAR(32),  -- 'normal', 'bold', 'italic', 'bold_italic'
  alignment VARCHAR(32),    -- 'left', 'center', 'right'
  color JSON,               -- [r, g, b]
  transform VARCHAR(32),    -- 'none', 'uppercase', 'lowercase', 'title_case'
  wrap_text BOOLEAN DEFAULT FALSE,
  conditional JSON,         -- { field: 0, equals: "Winner" }
  qr_source VARCHAR(255),   -- 'field_0', 'template_...'
  image_source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, field_index)
);

-- Batches (PDF generation jobs)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id),
  name VARCHAR(255),
  status VARCHAR(32) DEFAULT 'queued',  -- 'queued', 'processing', 'completed', 'failed'
  progress INT DEFAULT 0,
  total_rows INT,
  generated_count INT DEFAULT 0,
  flagged_count INT DEFAULT 0,
  csv_storage_path TEXT,
  metadata_storage_path TEXT,
  output_zip_url TEXT,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Performance stats
  generation_time_ms INT,
  avg_time_per_pdf_ms INT,
  output_size_mb FLOAT
);

-- Flagged PDFs (for review)
CREATE TABLE flagged_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  flags JSON,  -- Array of { field_index, field_label, flag_type, details }
  csv_data JSON,  -- Original row data
  pdf_storage_path TEXT,
  original_pdf_storage_path TEXT,
  edited BOOLEAN DEFAULT FALSE,
  edited_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_id, row_index)
);

-- Batch PDFs (all generated PDFs, for reference)
CREATE TABLE batch_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  pdf_storage_path TEXT,
  csv_data JSON,
  has_flags BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_id, row_index)
);

-- Indexes for performance
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_batches_user ON batches(user_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_flagged_pdfs_batch ON flagged_pdfs(batch_id);
CREATE INDEX idx_batch_pdfs_batch ON batch_pdfs(batch_id);
```

---

## Part 2: Frontend Architecture (Next.js)

### Directory Structure

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout (auth provider)
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── templates/
│   │   ├── page.tsx            # Templates list
│   │   ├── [id]/
│   │   │   ├── edit/page.tsx   # Template editor (canvas)
│   │   │   └── preview/page.tsx
│   ├── generate/
│   │   ├── page.tsx            # Select template + upload CSV
│   │   └── [batchId]/
│   │       ├── progress/page.tsx  # Live progress
│   │       └── review/page.tsx    # Flagged PDFs review
│   └── batches/page.tsx        # All generation history
├── api/
│   ├── templates/
│   │   ├── route.ts            # POST create, GET list
│   │   └── [id]/route.ts       # GET, PUT, DELETE
│   ├── templates/[id]/fields/route.ts
│   ├── generate/route.ts       # POST start generation
│   ├── batch/[id]/route.ts     # GET status
│   ├── batch/[id]/metadata/route.ts
│   ├── batch/[id]/pdf/route.ts # GET individual PDF
│   ├── batch/[id]/pdf/[rowId]/edit/route.ts  # POST edit PDF
│   └── batch/[id]/download/route.ts
└── components/
    ├── TemplateEditor/
    │   ├── Canvas.tsx          # Konva canvas with PDF preview
    │   ├── FieldPanel.tsx      # Field properties panel
    │   └── FieldList.tsx
    ├── CSVUploader.tsx
    ├── ProgressTracker.tsx     # Live progress with WebSocket
    ├── FlaggedPDFReview.tsx
    ├── PDFEditor.tsx           # Manual text editing
    └── shared/
        ├── Header.tsx
        ├── Sidebar.tsx
        └── Button.tsx
```

---

### Component: Template Editor (Canvas-Based)

```typescript
// components/TemplateEditor/Canvas.tsx

'use client';

import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';
import { PDFDocument } from 'pdf-lib';
import { useState, useRef } from 'react';
import Konva from 'konva';

interface Field {
  id: string;
  fieldIndex: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maxFontSize: number;
  minFontSize: number;
}

interface CanvasEditorProps {
  templatePdfUrl: string;
  fields: Field[];
  onFieldMove: (fieldId: string, x: number, y: number) => void;
  onFieldResize: (fieldId: string, width: number, height: number) => void;
  onFieldDelete: (fieldId: string) => void;
}

export default function CanvasEditor({
  templatePdfUrl,
  fields,
  onFieldMove,
  onFieldResize,
  onFieldDelete
}: CanvasEditorProps) {
  const [pdfImage, setPdfImage] = useState<HTMLImageElement | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load PDF preview (convert first page to image)
  useEffect(() => {
    const loadPdfPreview = async () => {
      const pdf = await PDFDocument.load(await fetch(templatePdfUrl).then(r => r.arrayBuffer()));
      const page = pdf.getPage(0);
      const { width, height } = page.getSize();
      
      // Use pdfjs-dist to render preview
      const canvas = await renderPdfPage(templatePdfUrl, 0);
      const img = new Image();
      img.src = canvas.toDataURL();
      setPdfImage(img);
    };
    
    loadPdfPreview();
  }, [templatePdfUrl]);

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    const node = stageRef.current?.findOne(`#${fieldId}`);
    if (node && transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  const handleDragEnd = (fieldId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    onFieldMove(fieldId, e.target.x(), e.target.y());
  };

  const handleTransformEnd = (fieldId: string) => {
    const node = stageRef.current?.findOne(`#${fieldId}`);
    if (node) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      node.scaleX(1);
      node.scaleY(1);
      
      onFieldResize(fieldId, node.width() * scaleX, node.height() * scaleY);
    }
  };

  return (
    <div className="template-editor">
      <Stage
        ref={stageRef}
        width={window.innerWidth - 300}
        height={window.innerHeight - 100}
        onMouseDown={() => setSelectedFieldId(null)}
      >
        <Layer>
          {/* PDF Preview Background */}
          {pdfImage && (
            <Image image={pdfImage} x={0} y={0} />
          )}
          
          {/* Editable Fields */}
          {fields.map(field => (
            <React.Fragment key={field.id}>
              <Rect
                id={field.id}
                x={field.x}
                y={field.y}
                width={field.width}
                height={field.height}
                stroke={selectedFieldId === field.id ? '#0066cc' : '#cccccc'}
                strokeWidth={2}
                fill="rgba(0, 102, 204, 0.1)"
                draggable
                onDragEnd={e => handleDragEnd(field.id, e)}
                onMouseEnter={e => e.target.getStage()!.container().style.cursor = 'move'}
                onMouseLeave={e => e.target.getStage()!.container().style.cursor = 'default'}
                onClick={() => handleFieldSelect(field.id)}
              />
              
              {/* Field Label */}
              <Text
                x={field.x + 4}
                y={field.y + 4}
                text={field.label}
                fontSize={12}
                fontFamily="Arial"
                fill={selectedFieldId === field.id ? '#0066cc' : '#666666'}
                pointerEvents="none"
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>

      <Transformer ref={transformerRef} />

      {/* Field Properties Panel */}
      {selectedFieldId && (
        <FieldPanel
          field={fields.find(f => f.id === selectedFieldId)!}
          onUpdate={onFieldUpdate}
          onDelete={() => onFieldDelete(selectedFieldId)}
        />
      )}
    </div>
  );
}
```

---

### Component: CSV Uploader + Preview

```typescript
// components/CSVUploader.tsx

'use client';

import { useState } from 'react';
import Papa from 'papaparse';

interface CSVUploaderProps {
  templateFieldCount: number;
  onCsvLoaded: (data: string[][], headers?: string[]) => void;
}

export default function CSVUploader({ templateFieldCount, onCsvLoaded }: CSVUploaderProps) {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        
        // Validation
        if (rows.length === 0) {
          setError('CSV file is empty');
          return;
        }
        
        if (rows[0].length < templateFieldCount) {
          setError(`CSV has ${rows[0].length} columns but template expects ${templateFieldCount} fields`);
          return;
        }
        
        // Check for issues
        const issues: { row: number; col: number; issue: string }[] = [];
        rows.forEach((row, rowIdx) => {
          row.forEach((cell, colIdx) => {
            if (cell.length === 0) {
              issues.push({ row: rowIdx, col: colIdx, issue: 'Empty cell' });
            }
            if (cell.includes('emoji') || /[\u{1F300}-\u{1F9FF}]/gu.test(cell)) {
              issues.push({ row: rowIdx, col: colIdx, issue: 'Contains emoji' });
            }
          });
        });
        
        setCsvData(rows);
        setError(null);
        
        if (issues.length > 0) {
          console.warn('CSV Issues:', issues);
        }
        
        onCsvLoaded(rows);
      },
      error: (error) => {
        setError(`CSV parsing error: ${error.message}`);
      }
    });
  };

  return (
    <div className="csv-uploader">
      <div className="upload-area" onClick={() => document.getElementById('csv-input')?.click()}>
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={e => e.target.files && handleFileUpload(e.target.files[0])}
          hidden
        />
        <p>Click to upload CSV or drag and drop</p>
      </div>

      {error && <div className="error">{error}</div>}

      {csvData && preview && (
        <div className="preview">
          <h3>CSV Preview ({csvData.length} rows)</h3>
          <table>
            <tbody>
              {csvData.slice(0, 5).map((row, idx) => (
                <tr key={idx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className={cell.length === 0 ? 'empty' : ''}>
                      {cell || '(empty)'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {csvData.length > 5 && <p>... and {csvData.length - 5} more rows</p>}
        </div>
      )}
    </div>
  );
}
```

---

### Component: Progress Tracker (Real-Time WebSocket/SSE)

```typescript
// components/ProgressTracker.tsx

'use client';

import { useEffect, useState } from 'react';

interface ProgressUpdate {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  generated_count: number;
  flagged_count: number;
  eta_seconds: number;
  error?: string;
}

interface ProgressTrackerProps {
  batchId: string;
  onComplete: () => void;
}

export default function ProgressTracker({ batchId, onComplete }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<ProgressUpdate>({
    status: 'processing',
    progress: 0,
    generated_count: 0,
    flagged_count: 0,
    eta_seconds: 0
  });

  useEffect(() => {
    // Use Server-Sent Events for real-time updates
    const eventSource = new EventSource(`/api/batch/${batchId}/progress`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as ProgressUpdate;
      setProgress(data);

      if (data.status === 'completed' || data.status === 'failed') {
        eventSource.close();
        onComplete();
      }
    };

    eventSource.onerror = (error) => {
      console.error('Progress stream error:', error);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [batchId, onComplete]);

  const formatEta = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="progress-tracker">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress.progress}%` }} />
      </div>

      <div className="progress-stats">
        <p>{progress.progress}% complete</p>
        <p>{progress.generated_count} PDFs generated</p>
        <p>{progress.flagged_count} flagged for review</p>
        {progress.status === 'processing' && (
          <p>ETA: {formatEta(progress.eta_seconds)}</p>
        )}
      </div>

      {progress.status === 'failed' && (
        <div className="error">{progress.error}</div>
      )}

      {progress.status === 'completed' && (
        <button onClick={() => window.location.href = `/dashboard/batches/${batchId}/review`}>
          Review Results
        </button>
      )}
    </div>
  );
}
```

---

### Component: Flagged PDFs Review

```typescript
// components/FlaggedPDFReview.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';

interface FlaggedPDF {
  row_index: number;
  csv_data: string[];
  flags: Array<{
    field_index: number;
    field_label: string;
    flag_type: string;
    details: string;
  }>;
  pdf_storage_path: string;
}

interface FlaggedPDFReviewProps {
  batchId: string;
  flaggedPdfs: FlaggedPDF[];
  templateFields: Array<{ index: number; label: string }>;
  onEditPdf: (rowIndex: number, updates: Record<number, string>) => Promise<void>;
}

export default function FlaggedPDFReview({
  batchId,
  flaggedPdfs,
  templateFields,
  onEditPdf
}: FlaggedPDFReviewProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<number, string>>({});

  const handleSaveEdit = async (rowIndex: number) => {
    await onEditPdf(rowIndex, editValues);
    setEditMode(null);
  };

  return (
    <div className="flagged-review">
      <h2>Flagged PDFs ({flaggedPdfs.length})</h2>

      {flaggedPdfs.map(pdf => (
        <div key={pdf.row_index} className="flagged-row">
          <div className="row-header" onClick={() => setExpandedRow(expandedRow === pdf.row_index ? null : pdf.row_index)}>
            <h3>Row {pdf.row_index}</h3>
            <p className="row-data">
              {pdf.csv_data.slice(0, 2).join(' | ')}
            </p>
            <span className="flag-count">{pdf.flags.length} issues</span>
          </div>

          {expandedRow === pdf.row_index && (
            <div className="row-details">
              {/* Show Flags */}
              <div className="flags">
                {pdf.flags.map((flag, idx) => (
                  <div key={idx} className="flag warning">
                    <strong>{flag.field_label}:</strong>
                    <span>{flag.flag_type}</span>
                    <p>{flag.details}</p>
                  </div>
                ))}
              </div>

              {/* PDF Preview */}
              <div className="pdf-preview">
                <object
                  data={pdf.pdf_storage_path}
                  type="application/pdf"
                  width="100%"
                  height="300px"
                />
              </div>

              {/* Edit Form */}
              {editMode === pdf.row_index ? (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleSaveEdit(pdf.row_index);
                }}>
                  {templateFields.map(field => (
                    <input
                      key={field.index}
                      type="text"
                      placeholder={field.label}
                      value={editValues[field.index] || pdf.csv_data[field.index] || ''}
                      onChange={e => setEditValues({
                        ...editValues,
                        [field.index]: e.target.value
                      })}
                    />
                  ))}
                  <button type="submit">Save & Regenerate</button>
                  <button type="button" onClick={() => setEditMode(null)}>Cancel</button>
                </form>
              ) : (
                <div className="actions">
                  <button onClick={() => {
                    setEditMode(pdf.row_index);
                    setEditValues(Object.fromEntries(
                      pdf.csv_data.map((val, idx) => [idx, val])
                    ));
                  }}>
                    Edit Text
                  </button>
                  <button onClick={() => window.location.href = pdf.pdf_storage_path}>
                    Download PDF
                  </button>
                  <button>Regenerate</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Part 3: Backend API Routes (Express)

### Template Management

```typescript
// api/templates/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/templates - List user's templates
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: templates, error } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(templates);
}

// POST /api/templates - Create new template
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const pdfFile = formData.get('pdf') as File;

  // Upload PDF to Supabase Storage
  const fileName = `${session.user.id}/${Date.now()}-${pdfFile.name}`;
  const { data, error: uploadError } = await supabase.storage
    .from('templates')
    .upload(fileName, pdfFile);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Create template record
  const { data: template, error: dbError } = await supabase
    .from('templates')
    .insert({
      user_id: session.user.id,
      name,
      pdf_storage_path: fileName,
      pdf_original_url: `${SUPABASE_URL}/storage/v1/object/public/templates/${fileName}`
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(template, { status: 201 });
}
```

---

### Generate Batch

```typescript
// api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Bull from 'bull';

// Initialize generation queue
const generationQueue = new Bull('document-generation', process.env.REDIS_URL!);

// POST /api/generate - Start batch generation
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const templateId = formData.get('template_id') as string;
  const csvFile = formData.get('csv') as File;
  const batchName = formData.get('batch_name') as string;

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', templateId)
    .eq('user_id', session.user.id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Upload CSV to storage
  const csvFileName = `${session.user.id}/${templateId}/${Date.now()}-${csvFile.name}`;
  const { data: csvData, error: csvUploadError } = await supabase.storage
    .from('batches')
    .upload(csvFileName, csvFile);

  if (csvUploadError) {
    return NextResponse.json({ error: csvUploadError.message }, { status: 500 });
  }

  // Create batch record
  const batchId = crypto.randomUUID();
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .insert({
      id: batchId,
      user_id: session.user.id,
      template_id: templateId,
      name: batchName,
      status: 'queued',
      csv_storage_path: csvFileName
    })
    .select()
    .single();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  // Add job to queue
  await generationQueue.add({
    batchId,
    userId: session.user.id,
    templateId,
    templateData: template,
    csvPath: csvFileName
  });

  return NextResponse.json(batch, { status: 201 });
}
```

---

### Generation Worker (Bull Queue)

```typescript
// lib/workers/generationWorker.ts

import Bull from 'bull';
import { spawn } from 'child_process';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const generationQueue = new Bull('document-generation', process.env.REDIS_URL!);

generationQueue.process(async (job) => {
  const { batchId, userId, templateId, templateData, csvPath } = job.data;

  try {
    // Update batch status
    await supabase.from('batches').update({ status: 'processing', started_at: new Date() }).eq('id', batchId);

    // Download CSV from storage
    const csvUrl = await supabase.storage.from('batches').createSignedUrl(csvPath, 60);
    const csvBuffer = await fetch(csvUrl).then(r => r.arrayBuffer());
    const csvFile = path.join('/tmp', `${batchId}.csv`);
    fs.writeFileSync(csvFile, Buffer.from(csvBuffer));

    // Download template PDF
    const templateUrl = await supabase.storage.from('templates').createSignedUrl(templateData.pdf_storage_path, 60);
    const pdfBuffer = await fetch(templateUrl).then(r => r.arrayBuffer());
    const pdfFile = path.join('/tmp', `${batchId}-template.pdf`);
    fs.writeFileSync(pdfFile, Buffer.from(pdfBuffer));

    // Create template.json for C engine
    const templateJson = {
      template_id: templateId,
      pdf_path: pdfFile,
      fields: templateData.template_fields.map(f => ({
        index: f.field_index,
        label: f.label,
        type: f.field_type,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        max_font_size: f.max_font_size,
        min_font_size: f.min_font_size,
        font_family: f.font_family,
        font_weight: f.font_weight,
        alignment: f.alignment,
        color: f.color
      }))
    };

    const templateJsonFile = path.join('/tmp', `${batchId}-template.json`);
    fs.writeFileSync(templateJsonFile, JSON.stringify(templateJson));

    // Run C engine
    const outputDir = path.join('/tmp', `batch-${batchId}`);
    fs.mkdirSync(outputDir, { recursive: true });

    const cEngine = spawn('./document_generator', [
      '--template', templateJsonFile,
      '--csv', csvFile,
      '--output-dir', outputDir,
      '--batch-id', batchId,
      '--format', 'zip'
    ]);

    let progress = 0;
    cEngine.stdout.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/\[(\d+)%\]/);
      if (match) {
        progress = parseInt(match[1]);
        job.progress(progress);  // Update Bull job progress
      }
    });

    // Wait for completion
    await new Promise((resolve, reject) => {
      cEngine.on('close', code => {
        if (code === 0) resolve(undefined);
        else reject(new Error(`C Engine exited with code ${code}`));
      });
      cEngine.on('error', reject);
    });

    // Load metadata
    const metadataFile = path.join(outputDir, 'batch_metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));

    // Upload results to Supabase Storage
    const zipFile = path.join(outputDir, `${batchId}.zip`);
    const zipBuffer = fs.readFileSync(zipFile);
    const zipStoragePath = `${userId}/${batchId}/results.zip`;
    
    await supabase.storage.from('batches').upload(zipStoragePath, zipBuffer);

    // Upload metadata
    const metadataStoragePath = `${userId}/${batchId}/metadata.json`;
    await supabase.storage.from('batches').upload(metadataStoragePath, JSON.stringify(metadata));

    // Store flagged PDFs in DB
    for (const flaggedRow of metadata.flagged_rows) {
      const pdfStoragePath = `${userId}/${batchId}/pdfs/row_${flaggedRow.row_index}.pdf`;
      
      // Upload PDF from local storage
      const pdfBuffer = fs.readFileSync(path.join(outputDir, 'pdfs', `row_${flaggedRow.row_index}.pdf`));
      await supabase.storage.from('batches').upload(pdfStoragePath, pdfBuffer);

      // Create flagged PDF record
      await supabase.from('flagged_pdfs').insert({
        batch_id: batchId,
        row_index: flaggedRow.row_index,
        flags: flaggedRow.flags,
        csv_data: flaggedRow.csv_data,
        pdf_storage_path: pdfStoragePath
      });
    }

    // Update batch completion
    const zipUrl = await supabase.storage.from('batches').createSignedUrl(zipStoragePath, 7 * 24 * 60 * 60); // 7 days

    await supabase.from('batches').update({
      status: 'completed',
      progress: 100,
      generated_count: metadata.generated_count,
      flagged_count: metadata.flagged_count,
      metadata_storage_path: metadataStoragePath,
      output_zip_url: zipUrl,
      completed_at: new Date(),
      generation_time_ms: metadata.generation_summary?.generation_time_ms,
      avg_time_per_pdf_ms: metadata.generation_summary?.average_time_per_pdf_ms,
      output_size_mb: metadata.generation_summary?.output_size_mb
    }).eq('id', batchId);

    // Cleanup temp files
    fs.rmSync(outputDir, { recursive: true });
    fs.unlinkSync(csvFile);
    fs.unlinkSync(pdfFile);
    fs.unlinkSync(templateJsonFile);

    return { status: 'completed', batchId };

  } catch (error) {
    console.error(`Generation failed for batch ${batchId}:`, error);

    await supabase.from('batches').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('id', batchId);

    throw error;
  }
});

export default generationQueue;
```

---

### Progress Streaming (SSE)

```typescript
// api/batch/[id]/progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const batchId = params.id;

  // Create SSE stream
  const encoder = new TextEncoder();
  let subscription: any;

  const stream = new ReadableStream({
    async start(controller) {
      // Initial status
      const { data: batch } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (batch) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          status: batch.status,
          progress: batch.progress,
          generated_count: batch.generated_count,
          flagged_count: batch.flagged_count,
          eta_seconds: 0
        })}\n\n`));
      }

      // Subscribe to changes (using Supabase Realtime)
      subscription = supabase
        .from('batches')
        .on('UPDATE', payload => {
          if (payload.new.id === batchId) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: payload.new.status,
              progress: payload.new.progress,
              generated_count: payload.new.generated_count,
              flagged_count: payload.new.flagged_count,
              eta_seconds: 0
            })}\n\n`));

            if (payload.new.status === 'completed' || payload.new.status === 'failed') {
              controller.close();
            }
          }
        })
        .subscribe();
    },
    cancel() {
      if (subscription) subscription.unsubscribe();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## Part 4: Edit Flagged PDF

```typescript
// api/batch/[id]/pdf/[rowId]/edit/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { spawn } from 'child_process';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  const batchId = params.id;
  const rowIndex = parseInt(params.rowId);
  const { updates } = await req.json();

  try {
    // Get batch and template
    const { data: batch } = await supabase
      .from('batches')
      .select('*, templates(*)')
      .eq('id', batchId)
      .single();

    const { data: flaggedPdf } = await supabase
      .from('flagged_pdfs')
      .select('*')
      .eq('batch_id', batchId)
      .eq('row_index', rowIndex)
      .single();

    // Apply updates to CSV data
    const updatedData = [...flaggedPdf.csv_data];
    Object.entries(updates).forEach(([fieldIndex, value]) => {
      updatedData[parseInt(fieldIndex)] = value;
    });

    // Regenerate single PDF
    const cEngine = spawn('./document_generator', [
      '--template', batch.templates.pdf_storage_path,
      '--csv', JSON.stringify([updatedData]),  // Single row
      '--output-dir', `/tmp/batch-${batchId}-row-${rowIndex}`,
      '--batch-id', `${batchId}-row-${rowIndex}`
    ]);

    await new Promise((resolve, reject) => {
      cEngine.on('close', code => {
        if (code === 0) resolve(undefined);
        else reject(new Error(`Regeneration failed`));
      });
    });

    // Upload updated PDF
    const updatedPdfPath = `${batch.user_id}/${batchId}/pdfs/row_${rowIndex}-edited.pdf`;
    // ... upload logic

    // Update flagged_pdf record
    await supabase
      .from('flagged_pdfs')
      .update({
        csv_data: updatedData,
        edited_by_user: true,
        pdf_storage_path: updatedPdfPath
      })
      .eq('batch_id', batchId)
      .eq('row_index', rowIndex);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
```

---

## Part 5: File Storage Strategy (Supabase Storage)

```
s3://supabase-bucket/
├── templates/
│   ├── {user_id}/
│   │   └── {timestamp}-{filename}.pdf
├── batches/
│   ├── {user_id}/
│   │   ├── {batch_id}/
│   │   │   ├── results.zip
│   │   │   ├── metadata.json
│   │   │   └── pdfs/
│   │   │       ├── row_0.pdf
│   │   │       ├── row_1.pdf
│   │   │       └── row_2.pdf
│   │   └── {csv_file}.csv
```

---

## Part 6: Security Considerations

1. **Authentication:** Use Supabase Auth (JWT tokens)
2. **Row-Level Security (RLS):** Prevent users from accessing other users' data
3. **File Access:** Generate signed URLs with 24-hour expiry
4. **Input Validation:** Validate CSV, template fields, PDF uploads
5. **Rate Limiting:** Limit generations per user per hour
6. **Virus Scanning:** Scan uploaded files with ClamAV

```sql
-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_pdfs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_templates ON templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY users_own_batches ON batches
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Part 7: Deployment (Docker + Vercel/Railway)

### Frontend (Vercel)
```
Deploy Next.js to Vercel automatically on push to main
```

### Backend + C Engine (Railway/Render)
```dockerfile
FROM node:18

RUN apt-get update && apt-get install -y \
  build-essential \
  libharu-dev \
  libjansson-dev \
  libqrencode-dev \
  redis-server

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Compile C engine
RUN gcc -O3 -o document_generator src/*.c -lharu -ljansson -lqrencode -lpthread

EXPOSE 3001
CMD ["npm", "run", "start"]
```

---

## Part 8: Future Enhancements

- **AI Field Detection:** Auto-detect where fields should go on template
- **Bulk Template Library:** Pre-made templates for common documents
- **Team Collaboration:** Share templates with team members
- **Webhooks:** Notify external systems when batches complete
- **Payment Integration:** Charge per generated PDF
- **Advanced Analytics:** Track usage, generation speed, flag trends

---

## Success Criteria

✅ Users can upload PDF templates (one-click)
✅ Visual drag-drop field editor (Konva canvas)
✅ CSV upload with validation + preview
✅ Batch generation with real-time progress
✅ Flagged PDFs dashboard with manual editing
✅ Download results as ZIP
✅ Generation speed: 1000 PDFs in <20 seconds
✅ Mobile-responsive design
✅ Multi-user support with auth
✅ Row-level security (users see only their data)