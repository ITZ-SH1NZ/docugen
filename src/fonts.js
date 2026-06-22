import { StandardFonts } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// ── Standard (built-in) fonts ────────────────────────────────────────────────
// The 14 fonts pdf-lib embeds without any font file — fastest path.
const FAMILY_MAP = {
  arial: StandardFonts.Helvetica,
  helvetica: StandardFonts.Helvetica,
  times: StandardFonts.TimesRoman,
  'times new roman': StandardFonts.TimesRoman,
  georgia: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
  'courier new': StandardFonts.Courier,
  mono: StandardFonts.Courier,
};

export function resolveStandardFont(family) {
  if (!family) return StandardFonts.Helvetica;
  return FAMILY_MAP[family.toLowerCase()] ?? StandardFonts.Helvetica;
}

// ── Custom fonts (bundled via @fontsource, embedded with fontkit) ─────────────
// Each entry maps a family name to its @fontsource package + woff2 basename.
// Fonts are chosen PER FIELD (each template_field has its own font_family /
// font_weight), so a single document can mix several typefaces.
const CUSTOM_FONTS = {
  'playfair display': { pkg: 'playfair-display', base: 'playfair-display-latin' },
  inter: { pkg: 'inter', base: 'inter-latin' },
  roboto: { pkg: 'roboto', base: 'roboto-latin' },
  montserrat: { pkg: 'montserrat', base: 'montserrat-latin' },
  lora: { pkg: 'lora', base: 'lora-latin' },
};

// Families that should be offered in the editor (standard + custom).
export const FONT_OPTIONS = [
  'Arial',
  'Times',
  'Courier',
  'Playfair Display',
  'Inter',
  'Roboto',
  'Montserrat',
  'Lora',
];

export function isCustomFamily(family) {
  return !!family && Object.prototype.hasOwnProperty.call(CUSTOM_FONTS, family.toLowerCase());
}

// A stable cache key for a (family, weight) pair.
export function fontKey(family, weight) {
  const bold = String(weight).toLowerCase().includes('bold') || String(weight) === '700';
  return `${(family || '').toLowerCase()}|${bold ? 700 : 400}`;
}

// Read the woff2 bytes for a custom (family, weight). Returns null if the
// family isn't custom or the file can't be found (caller falls back to standard).
export async function loadCustomFontBytes(family, weight) {
  const entry = CUSTOM_FONTS[(family || '').toLowerCase()];
  if (!entry) return null;
  const bold = String(weight).toLowerCase().includes('bold') || String(weight) === '700';
  const file = `${entry.base}-${bold ? 700 : 400}-normal.woff2`;
  const path = join(process.cwd(), 'node_modules', '@fontsource', entry.pkg, 'files', file);
  try {
    return await readFile(path);
  } catch {
    return null; // missing font file → graceful fallback to a standard font
  }
}
