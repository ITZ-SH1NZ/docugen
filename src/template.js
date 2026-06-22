import { readFile } from 'node:fs/promises';

// Loads and validates a template.json file.
// Fills in sensible defaults so downstream code can assume every field is complete.

const REQUIRED_FIELD_KEYS = ['index', 'x', 'y', 'width', 'height'];

export async function loadTemplate(path) {
  const raw = await readFile(path, 'utf8');
  let template;
  try {
    template = JSON.parse(raw);
  } catch (err) {
    throw new Error(`template.json is not valid JSON: ${err.message}`);
  }
  if (!template.pdf_path) {
    throw new Error('template.json is missing "pdf_path"');
  }
  return normalizeTemplate(template);
}

// Validate and apply defaults to a template object (no filesystem access).
// Shared by the CLI loader and the web API, which receives the object directly.
export function normalizeTemplate(template) {
  if (!Array.isArray(template.fields) || template.fields.length === 0) {
    throw new Error('template must contain a non-empty "fields" array');
  }
  return {
    ...template,
    template_id: template.template_id || 'template',
    fields: template.fields.map((field, i) => normalizeField(field, i)),
  };
}

function normalizeField(field, position) {
  for (const key of REQUIRED_FIELD_KEYS) {
    if (typeof field[key] !== 'number') {
      throw new Error(
        `field at position ${position} is missing required numeric "${key}"`,
      );
    }
  }

  return {
    index: field.index,
    label: field.label ?? `field_${field.index}`,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    max_font_size: field.max_font_size ?? 24,
    min_font_size: field.min_font_size ?? 8,
    font_family: field.font_family ?? 'Helvetica',
    font_weight: field.font_weight ?? 'normal',
    alignment: field.alignment ?? 'left',
    color: normalizeColor(field.color),
    // v2 additions (backward-compatible defaults preserve prior behavior):
    transform: field.transform ?? 'none', // none|uppercase|lowercase|title_case
    wrap: field.wrap ?? field.wrap_text ?? true,
  };
}

// Apply a text transform before measuring/rendering.
export function applyTransform(text, transform) {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'title_case':
      return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    default:
      return text;
  }
}

// Accepts [r,g,b] in 0–255 (or 0–1) and returns normalized 0–1 components.
function normalizeColor(color) {
  if (!Array.isArray(color) || color.length < 3) return { r: 0, g: 0, b: 0 };
  const max = Math.max(color[0], color[1], color[2]);
  const scale = max > 1 ? 255 : 1;
  return {
    r: clamp01(color[0] / scale),
    g: clamp01(color[1] / scale),
    b: clamp01(color[2] / scale),
  };
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
