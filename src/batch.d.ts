// Type declarations for the JS engine (src/batch.js).

export interface BatchFile {
  name: string;
  bytes: Uint8Array;
}

export interface EngineFlag {
  field_index: number;
  field_label: string;
  flag_type: 'text_shrunk' | 'text_wrapped' | 'text_truncated';
  details: string;
}

export interface EngineRow {
  row_index: number;
  csv_data: string[];
  flags: EngineFlag[];
  pdf_path: string;
}

export interface EngineMetadata {
  batch_id: string;
  template_id: string;
  timestamp: string;
  total_rows: number;
  generated_count: number;
  flagged_count: number;
  output_dir: string;
  flagged_rows: EngineRow[];
  all_rows: EngineRow[];
}

export interface ProgressInfo {
  generated: number;
  total: number;
  flagged: number;
}

export function buildBatch(args: {
  template: unknown;
  templateBytes: Uint8Array;
  csvText: string;
  batchId: string;
  onProgress?: (p: ProgressInfo) => void | Promise<void>;
}): Promise<{ metadata: EngineMetadata; files: BatchFile[] }>;

export function runBatch(args: {
  templatePath: string;
  csvPath: string;
  outputDir: string;
  batchId: string;
}): Promise<EngineMetadata>;
