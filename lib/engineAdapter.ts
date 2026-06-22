import type { TemplateFieldRow, EngineTemplate } from './types';

// Convert persisted template fields (snake_case, field_index) into the
// engine's template.json shape (buildBatch consumes this). The engine also
// reads `transform` and `wrap` per field; we pass them through.
export function toEngineTemplate(
  templateId: string,
  fields: TemplateFieldRow[],
): EngineTemplate & {
  fields: Array<
    EngineTemplate['fields'][number] & { font_weight: string; transform: string; wrap: boolean }
  >;
} {
  return {
    template_id: templateId,
    fields: fields
      .slice()
      .sort((a, b) => a.field_index - b.field_index)
      .map((f) => ({
        index: f.field_index,
        label: f.label,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        max_font_size: f.max_font_size,
        min_font_size: f.min_font_size,
        font_family: f.font_family,
        font_weight: f.font_weight,
        alignment: f.alignment,
        color: f.color,
        transform: f.transform,
        wrap: f.wrap_text,
      })),
  };
}
