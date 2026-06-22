# Document Automation Platform - C Backend Engine

## Project Overview

Build a C-based document generation engine for personalized PDFs from templates + CSV data.

**Context:** This is the backend core for a visual document automation tool. The frontend (Next.js) allows users to:
1. Upload PDF templates and define text field positions
2. Upload CSV data
3. Trigger batch PDF generation

Your job: Build the generation engine in C.

---

## Architecture

```
Next.js Frontend (Template Editor + CSV Upload)
            ↓
     Node.js API Layer
            ↓
   C Engine (this)
            ↓
   PDFs + Metadata JSON
```

The Node.js layer will:
- Call your C executable with JSON input
- Collect flagged output
- Return results to frontend

---

## Input/Output Contracts

### Input: `template.json`

```json
{
  "template_id": "cert_2026",
  "pdf_path": "/uploads/certificate_template.pdf",
  "fields": [
    {
      "index": 0,
      "label": "Participant Name",
      "x": 420,
      "y": 180,
      "width": 300,
      "height": 50,
      "max_font_size": 24,
      "min_font_size": 8,
      "font_family": "Arial",
      "alignment": "center",
      "color": [0, 0, 0]
    },
    {
      "index": 1,
      "label": "Date",
      "x": 420,
      "y": 280,
      "width": 200,
      "height": 30,
      "max_font_size": 14,
      "min_font_size": 10,
      "font_family": "Arial",
      "alignment": "center",
      "color": [0, 0, 0]
    }
  ]
}
```

### Input: `data.csv`

```
Tejas,21-06-2026
Arjun,21-06-2026
Muhammadullah Krishnamurthy,21-06-2026
```

### Output: `batch_metadata.json`

```json
{
  "batch_id": "batch_20260621_143000",
  "template_id": "cert_2026",
  "timestamp": "2026-06-21T14:30:00Z",
  "total_rows": 3,
  "generated_count": 3,
  "flagged_count": 1,
  "output_dir": "/output/batch_20260621_143000",
  "flagged_rows": [
    {
      "row_index": 2,
      "csv_data": ["Muhammadullah Krishnamurthy", "21-06-2026"],
      "flags": [
        {
          "field_index": 0,
          "field_label": "Participant Name",
          "flag_type": "text_shrunk",
          "details": "Text shrunk from 24pt to 10pt to fit in box"
        }
      ],
      "pdf_path": "row_2.pdf"
    }
  ],
  "all_rows": [
    {
      "row_index": 0,
      "csv_data": ["Tejas", "21-06-2026"],
      "flags": [],
      "pdf_path": "row_0.pdf"
    },
    {
      "row_index": 1,
      "csv_data": ["Arjun", "21-06-2026"],
      "flags": [],
      "pdf_path": "row_1.pdf"
    },
    {
      "row_index": 2,
      "csv_data": ["Muhammadullah Krishnamurthy", "21-06-2026"],
      "flags": [
        {
          "field_index": 0,
          "field_label": "Participant Name",
          "flag_type": "text_shrunk",
          "details": "Text shrunk from 24pt to 10pt to fit in box"
        }
      ],
      "pdf_path": "row_2.pdf"
    }
  ]
}
```

---

## Core Algorithm: Text Fitting

For each field in each row:

```
1. Get text from CSV[row][field_index]
2. Set fontSize = max_font_size

3. LOOP:
   a. Measure text width at current fontSize
   b. IF text_width <= field.width AND text_height <= field.height:
      - DONE, use this fontSize
   c. ELSE IF fontSize > min_font_size:
      - fontSize--
      - REPEAT
   d. ELSE (fontSize == min_font_size and still doesn't fit):
      - TRY WRAPPING:
        * Break text into lines (max_width)
        * Measure total height
        * IF total_height <= field.height:
          - USE wrapped text at min_font_size
          - ADD FLAG: "text_wrapped"
          - DONE
      - ELSE (wrapped text still doesn't fit):
        * TRUNCATE text to fit box
        * ADD FLAG: "text_truncated"
        * DONE

4. IF fontSize < max_font_size:
   ADD FLAG: "text_shrunk_to_Xpt"

5. RENDER text at (field.x, field.y) with calculated fontSize
```

---

## Implementation Requirements

### 1. CSV Parsing

- Read CSV file (handle quoted fields, commas in text)
- Parse into 2D array: `rows[row_idx][col_idx]`
- Handle edge cases: empty cells, special characters

### 2. PDF Handling

- **Library:** Use `libharu` (free, lightweight) or `pdflib` (if available)
- Load base PDF template
- Overlay text at specified coordinates
- Preserve original PDF content (don't overwrite)
- Save as new PDF per row

### 3. Text Measurement

- Use font metrics to calculate text width/height at given fontSize
- Account for font family (Arial, Times, etc.)
- Support text wrapping algorithm

### 4. Flagging System

```c
typedef struct {
  int field_index;
  char field_label[256];
  char flag_type[64];  // "text_shrunk", "text_wrapped", "text_truncated"
  char details[512];
} Flag;

typedef struct {
  int row_index;
  Flag* flags;
  int flag_count;
  int actual_font_size;
  int line_count;  // if wrapped
} RowMetadata;
```

### 5. JSON Output

- Generate `batch_metadata.json` with all flagged rows and metadata
- Use `jansson` or `cjson` library for JSON generation
- Include `all_rows` array (even non-flagged ones for completeness)

---

## Command-Line Interface

```bash
./document_generator \
  --template template.json \
  --csv data.csv \
  --output-dir ./output \
  --batch-id batch_20260621_143000
```

**Output:**
- `/output/batch_20260621_143000/row_0.pdf`
- `/output/batch_20260621_143000/row_1.pdf`
- `/output/batch_20260621_143000/row_2.pdf`
- `/output/batch_20260621_143000/batch_metadata.json`

---

## MVP Scope

### Phase 1 (Minimum Viable)

- ✅ CSV parsing
- ✅ Load PDF template
- ✅ Text fitting algorithm (shrink + wrap logic)
- ✅ Render text on PDF
- ✅ Generate `batch_metadata.json` with flags
- ✅ CLI interface

### Phase 2 (Nice to Have)

- Image insertion (not just text)
- Multiple font families
- Text rotation/skewing
- Barcode/QR code generation

---

## Testing

Provide sample inputs:
- `test_template.json` - certificate with 4 fields
- `test_data.csv` - 5 rows including short names, long names, special chars
- Expected output: 5 PDFs + metadata with at least 1 flagged row

---

## Stack Recommendations

**Libraries:**
- `libharu` - PDF generation (simpler than alternatives)
- `jansson` - JSON parsing/generation
- `csv.h` - CSV parsing (lightweight)
- Standard libc for string manipulation

**Build:**
- Makefile or CMake
- Compile for Linux/macOS/Windows

---

## Notes

- Focus on correctness over speed for MVP
- The Node.js layer will handle async/queuing
- Keep C binary stateless (one invocation = one batch)
- Output all metadata to JSON so frontend can consume easily