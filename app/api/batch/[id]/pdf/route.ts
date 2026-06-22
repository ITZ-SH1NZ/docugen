import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadBytes } from '@/lib/storage';
import { toEngineTemplate } from '@/lib/engineAdapter';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { parseCsv } from '@/src/csv.js';
import { resolveStandardFont, fontKey, loadCustomFontBytes } from '@/src/fonts.js';
import { fitText } from '@/src/textFit.js';
import { applyTransform } from '@/src/template.js';
import type { BatchRecord, TemplateRecord, TemplateFieldRow } from '@/lib/types';

export const runtime = 'nodejs';

// GET /api/batch/:id/pdf — generates a single merged PDF containing all certificates.
// By reusing the same template PDF page resources in pdf-lib, the file size is kept
// extremely small (e.g. 2.5MB instead of 180MB), avoiding memory and storage overload issues.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Fetch batch
  const { data: batchData } = await supabase
    .from('batches')
    .select('*')
    .eq('id', id)
    .single();
  const batch = batchData as BatchRecord | null;
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

  // 2. Fetch template
  const { data: templateData } = await supabase
    .from('templates')
    .select('*, template_fields(*)')
    .eq('id', batch.template_id)
    .single();
  const template = templateData as (TemplateRecord & { template_fields: TemplateFieldRow[] }) | null;
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  if (!batch.csv_storage_path) {
    return NextResponse.json({ error: 'CSV file path is missing' }, { status: 400 });
  }
  if (!template.pdf_storage_path) {
    return NextResponse.json({ error: 'Template file path is missing' }, { status: 400 });
  }

  try {
    // 3. Download base CSV and template PDF in parallel
    const [csvBytes, templateBytes] = await Promise.all([
      downloadBytes('batches', batch.csv_storage_path),
      downloadBytes('templates', template.pdf_storage_path),
    ]);

    const csvText = new TextDecoder().decode(csvBytes);
    const rows = parseCsv(csvText);
    const engineTemplate = toEngineTemplate(template.id, template.template_fields);

    // 4. Load source template PDF and create destination document
    const srcDoc = await PDFDocument.load(templateBytes);
    const outDoc = await PDFDocument.create();
    outDoc.registerFontkit(fontkit);

    const [srcPage] = srcDoc.getPages();
    const { width, height } = srcPage.getSize();
    const embeddedPage = await outDoc.embedPage(srcPage);

    // Preload custom fonts
    let fontAssets: any[] = [];
    try {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'font');
      if (data) fontAssets = data;
    } catch (e) {
      // Ignore if table does not exist
    }

    const wanted = new Map();
    for (const f of engineTemplate.fields) {
      const key = fontKey(f.font_family, f.font_weight);
      if (!wanted.has(key)) wanted.set(key, { family: f.font_family, weight: f.font_weight });
    }
    const customFonts = new Map();
    await Promise.all(
      [...wanted.entries()].map(async ([key, { family, weight }]) => {
        let bytes: Uint8Array | null = await loadCustomFontBytes(family, weight);

        if (!bytes && fontAssets.length > 0) {
          const asset = fontAssets.find((a) =>
            a.name.toLowerCase() === family.toLowerCase() ||
            a.name.toLowerCase().replace(/\.[a-z0-9]+$/i, '') === family.toLowerCase()
          );
          if (asset) {
            try {
              bytes = await downloadBytes('assets', asset.storage_path);
            } catch (e) {
              console.warn(`Failed to download custom font asset ${asset.name}:`, e);
            }
          }
        }

        if (bytes) customFonts.set(key, bytes);
      }),
    );

    // Embed fonts in outDoc
    const embeddedFonts = new Map();
    const getFont = async (family: string, weight: string) => {
      const key = fontKey(family, weight);
      if (embeddedFonts.has(key)) return embeddedFonts.get(key);

      let font;
      const bytes = customFonts.get(key);
      if (bytes) {
        font = await outDoc.embedFont(bytes, { subset: true });
      } else {
        font = await outDoc.embedFont(resolveStandardFont(family));
      }
      embeddedFonts.set(key, font);
      return font;
    };

    // 5. Render each row onto a copied template page
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const page = outDoc.addPage([width, height]);
      page.drawPage(embeddedPage, { x: 0, y: 0, width, height });
      const pageHeight = height;

      for (const field of engineTemplate.fields) {
        const raw = rowData[field.index] ?? '';
        const text = applyTransform(raw, field.transform);
        const font = await getFont(field.font_family, field.font_weight);
        const fit = fitText(text, field, font);

        const { lines, fontSize, lineHeight } = fit;
        const color = rgb(field.color[0] / 255, field.color[1] / 255, field.color[2] / 255);
        const boxTop = pageHeight - field.y;

        lines.forEach((line: string, lineIdx: number) => {
          const textWidth = font.widthOfTextAtSize(line, fontSize);
          let x = field.x;
          if (field.alignment === 'center') {
            x = field.x + (field.width - textWidth) / 2;
          } else if (field.alignment === 'right') {
            x = field.x + (field.width - textWidth);
          }

          const baseline = boxTop - lineIdx * lineHeight - font.heightAtSize(fontSize);
          page.drawText(line, { x, y: baseline, size: fontSize, font, color });
        });
      }
    }

    const outPdfBytes = await outDoc.save();
    const filename = `${batch.name || 'batch_' + id.slice(0, 8)}_merged.pdf`;

    return new NextResponse(new Uint8Array(outPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(outPdfBytes.length),
      },
    });
  } catch (err: any) {
    console.error('[MergedDownload] failed:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
