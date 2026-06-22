// Shared domain types used across the UI, API routes, and worker.

export type Alignment = 'left' | 'center' | 'right';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'title_case';
export type RGB = [number, number, number];

// A template field as edited in the UI / stored in `template_fields`.
// Geometry is in PDF points with a top-left origin (matches the engine).
export interface TemplateField {
  id: string; // client id while editing; row id once persisted
  field_index: number;
  label: string;
  field_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  max_font_size: number;
  min_font_size: number;
  font_family: string;
  font_weight: string;
  alignment: Alignment;
  color: RGB;
  transform: TextTransform;
  wrap_text: boolean;
}

export interface TemplateRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  pdf_storage_path: string | null;
  page_width: number | null;
  page_height: number | null;
  created_at: string;
  updated_at: string;
  version: number;
  template_fields?: TemplateFieldRow[];
}

// Row shape as returned by Supabase (snake_case, includes db id).
export interface TemplateFieldRow {
  id: string;
  template_id: string;
  field_index: number;
  label: string;
  field_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  max_font_size: number;
  min_font_size: number;
  font_family: string;
  font_weight: string;
  alignment: Alignment;
  color: RGB;
  transform: TextTransform;
  wrap_text: boolean;
}

export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface BatchRecord {
  id: string;
  user_id: string;
  template_id: string;
  name: string | null;
  status: BatchStatus;
  progress: number;
  total_rows: number | null;
  generated_count: number;
  flagged_count: number;
  csv_storage_path: string | null;
  metadata_storage_path: string | null;
  output_zip_path: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Flag {
  field_index: number;
  field_label: string;
  flag_type: 'text_shrunk' | 'text_wrapped' | 'text_truncated';
  details: string;
}

export interface FlaggedPdfRow {
  id: string;
  batch_id: string;
  row_index: number;
  flags: Flag[];
  csv_data: string[];
  pdf_storage_path: string | null;
  edited: boolean;
  edited_by_user: boolean;
}

// Engine-facing template.json shape (what buildBatch consumes).
export interface EngineField {
  index: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  max_font_size: number;
  min_font_size: number;
  font_family: string;
  alignment: Alignment;
  color: RGB;
}

export interface EngineTemplate {
  template_id: string;
  pdf_path?: string;
  fields: EngineField[];
}

// Progress payload streamed to the client over SSE.
export interface ProgressUpdate {
  status: BatchStatus;
  progress: number;
  generated_count: number;
  flagged_count: number;
  total_rows: number;
  error?: string | null;
}
