'use client';

import type { TemplateField, RGB, Alignment, TextTransform } from '@/lib/types';

// Standard PDF fonts + bundled custom families (embedded via fontkit at render).
const FONTS = ['Arial', 'Times', 'Courier', 'Playfair Display', 'Inter', 'Roboto', 'Montserrat', 'Lora'];
const WEIGHTS = ['normal', 'bold'];
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
  field: TemplateField | undefined;
  columnCount: number;
  onUpdate: (patch: Partial<TemplateField>) => void;
  onDelete: () => void;
}

export default function FieldPanel({ field, columnCount, onUpdate, onDelete }: Props) {
  if (!field) {
    return (
      <div className="card">
        <h3>Field properties</h3>
        <p className="hint">Select a field on the canvas, or add one.</p>
      </div>
    );
  }
  const num = (v: string) => Number(v) || 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Field properties</h3>
        <button className="danger" style={{ padding: '3px 9px' }} onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="spacer" />
      <div className="field-grid">
        <div className="full">
          <label>Label</label>
          <input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
        </div>

        <div>
          <label>CSV column</label>
          <select
            value={field.field_index}
            onChange={(e) => onUpdate({ field_index: Number(e.target.value) })}
          >
            {Array.from({ length: Math.max(columnCount, field.field_index + 1) }, (_, i) => (
              <option key={i} value={i}>
                Column {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Font family</label>
          <select
            value={field.font_family}
            onChange={(e) => onUpdate({ font_family: e.target.value })}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Weight</label>
          <select
            value={field.font_weight}
            onChange={(e) => onUpdate({ font_weight: e.target.value })}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Alignment</label>
          <select
            value={field.alignment}
            onChange={(e) => onUpdate({ alignment: e.target.value as Alignment })}
          >
            {ALIGN.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Transform</label>
          <select
            value={field.transform}
            onChange={(e) => onUpdate({ transform: e.target.value as TextTransform })}
          >
            {TRANSFORMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Max font (pt)</label>
          <input
            type="number"
            min={1}
            value={field.max_font_size}
            onChange={(e) => onUpdate({ max_font_size: num(e.target.value) })}
          />
        </div>
        <div>
          <label>Min font (pt)</label>
          <input
            type="number"
            min={1}
            value={field.min_font_size}
            onChange={(e) => onUpdate({ min_font_size: num(e.target.value) })}
          />
        </div>

        <div>
          <label>Color</label>
          <input
            type="color"
            value={rgbToHex(field.color)}
            onChange={(e) => onUpdate({ color: hexToRgb(e.target.value) })}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <input
            id="wrap"
            type="checkbox"
            style={{ width: 'auto' }}
            checked={field.wrap_text}
            onChange={(e) => onUpdate({ wrap_text: e.target.checked })}
          />
          <label htmlFor="wrap" style={{ margin: 0 }}>
            Wrap text
          </label>
        </div>

        <div>
          <label>X (pt)</label>
          <input
            type="number"
            value={Math.round(field.x)}
            onChange={(e) => onUpdate({ x: num(e.target.value) })}
          />
        </div>
        <div>
          <label>Y (pt)</label>
          <input
            type="number"
            value={Math.round(field.y)}
            onChange={(e) => onUpdate({ y: num(e.target.value) })}
          />
        </div>
        <div>
          <label>Width (pt)</label>
          <input
            type="number"
            value={Math.round(field.width)}
            onChange={(e) => onUpdate({ width: num(e.target.value) })}
          />
        </div>
        <div>
          <label>Height (pt)</label>
          <input
            type="number"
            value={Math.round(field.height)}
            onChange={(e) => onUpdate({ height: num(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
