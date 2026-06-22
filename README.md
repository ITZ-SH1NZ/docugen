# Document Generator

A full-stack document automation **SaaS** plus the standalone generation engine that
powers it. Upload PDF templates, place dynamic fields on a canvas, batch-generate
personalized PDFs from CSV, review flagged documents, fix them inline, and download.

- **Web app** (Next.js + Supabase + react-konva, no queue/Redis — batches generate
  in-process via Next's `after()`): see **[SETUP.md](SETUP.md)** for prerequisites,
  Supabase configuration, and how to run it.
- **Engine + CLI** (Node + `pdf-lib`): documented below — usable on its own, no
  accounts required.

The engine is **Node.js + [`pdf-lib`](https://pdf-lib.js.org/)** rather than the
C/libharu stack the prompts sketched. Rationale: libharu cannot load and overlay onto
an existing template PDF (it only builds PDFs from scratch), and everything else
(API + worker) is already Node — one language, native font measurement, no subprocess.
See "Why not C/libharu" below.

---

## The engine / CLI

## Install

```bash
npm install
```

## Usage

```bash
node index.js \
  --template path/to/template.json \
  --csv      path/to/data.csv \
  --output-dir ./output \
  --batch-id batch_20260621_143000   # optional; auto-generated if omitted
```

Outputs, under `<output-dir>/<batch-id>/`:

- `row_0.pdf`, `row_1.pdf`, … — one personalized PDF per CSV row
- `batch_metadata.json` — full batch report (see contract below)

The metadata JSON is also printed to **stdout** so the Node API layer can capture it
directly without reading the file.

## Try it

```bash
npm run make-sample   # writes test/certificate_template.pdf
npm test              # runs the engine over test/ fixtures into ./output
```

`npm test` generates 5 certificates; row 4 (a 120-character name) is flagged
`text_shrunk`.

## Input contracts

### `template.json`

```json
{
  "template_id": "cert_2026",
  "pdf_path": "certificate_template.pdf",
  "fields": [
    {
      "index": 0,
      "label": "Participant Name",
      "x": 121, "y": 205, "width": 600, "height": 50,
      "max_font_size": 30, "min_font_size": 10,
      "font_family": "Times", "alignment": "center",
      "color": [40, 30, 12]
    }
  ]
}
```

- `pdf_path` may be absolute or relative to the template file.
- `index` maps the field to a **0-based CSV column**.
- **Coordinates** (`x`, `y`) are the **top-left** corner of the box, measured from the
  **top-left of the page** (the convention visual editors use). The engine converts to
  PDF's native bottom-left origin internally.
- `color` accepts `[r, g, b]` in either 0–255 or 0–1.
- `font_family`: Arial/Helvetica, Times, Courier (mapped to the standard PDF fonts).
  `alignment`: `left` | `center` | `right`. All optional fields have defaults.

### `data.csv`

Header-less, one row per document. Quoted fields, commas-in-quotes, escaped quotes
(`""`), and CRLF/LF are all handled.

```
Tejas,Advanced C Programming,21-06-2026,CERT-0001
"Smith, John",Data Science,21-06-2026,CERT-0004
```

## Output: `batch_metadata.json`

```json
{
  "batch_id": "...", "template_id": "...", "timestamp": "ISO-8601",
  "total_rows": 5, "generated_count": 5, "flagged_count": 1,
  "output_dir": "...",
  "flagged_rows": [ { "row_index": 4, "csv_data": [...], "flags": [...], "pdf_path": "row_4.pdf" } ],
  "all_rows":     [ { "row_index": 0, "csv_data": [...], "flags": [],   "pdf_path": "row_0.pdf" }, ... ]
}
```

Each flag: `{ field_index, field_label, flag_type, details }` where `flag_type` is
`text_shrunk`, `text_wrapped`, or `text_truncated`.

## Text-fitting algorithm

For each field value:

1. **Shrink** — try the text on one line from `max_font_size` down to
   `min_font_size`; use the first size where it fits the box. → `text_shrunk` if it
   ended below max.
2. **Wrap** — if it still won't fit on one line at `min_font_size`, greedily word-wrap
   (long single words are hard-split). If the wrapped block fits the box height, use
   it. → `text_wrapped`.
3. **Truncate** — if even wrapped text overflows the height, keep the lines that fit
   and append an ellipsis (`…`) to the last one. → `text_truncated`.

## Project layout

| File | Responsibility |
|------|----------------|
| `index.js` | CLI entry / argument parsing |
| `src/batch.js` | Orchestration: CSV + template → PDFs + metadata |
| `src/csv.js` | RFC 4180-style CSV parser |
| `src/template.js` | Load + validate + default `template.json` |
| `src/textFit.js` | Shrink/wrap/truncate engine + flagging |
| `src/render.js` | Draw fitted text onto the template via pdf-lib |
| `src/fonts.js` | Font-family → standard PDF font mapping |

## Why not C / libharu

The original prompt recommended C with libharu. The blocking problem: **libharu can
only generate PDFs from scratch — it has no API to load an existing template PDF and
overlay onto it**, which is the core requirement here. Doing it in C would mean adding
PDFium/MuPDF for page import, plus hand-rolled CSV/JSON/UTF-8/font-metrics handling.
`pdf-lib` does template loading, text drawing, font embedding, and width/height
measurement out of the box, in the same language as the surrounding API.

## Roadmap (Phase 2)

- Custom/embedded TTF fonts (`pdf-lib` + `@pdf-lib/fontkit`) beyond the 14 standard fonts
- Image / logo insertion, QR / barcode fields
- Text rotation, multi-page templates
# docugen
