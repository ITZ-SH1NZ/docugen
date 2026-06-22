// Text-fitting engine. Given a string, a box, and font-size bounds, it decides
// the final font size, whether the text was wrapped or truncated, and emits
// flags describing any degradation.
//
// `font` must expose pdf-lib's measurement API:
//   font.widthOfTextAtSize(text, size) -> number
//   font.heightAtSize(size)            -> number
//
// Returns:
//   {
//     lines: string[],      // one or more lines to render
//     fontSize: number,     // chosen size
//     lineHeight: number,   // per-line advance
//     flags: Flag[],        // { flag_type, details }
//   }

const LINE_SPACING = 1.15; // multiplier on glyph height for line advance

export function fitText(text, field, font) {
  const { width: boxW, height: boxH, max_font_size: maxSize, min_font_size: minSize } = field;
  text = (text ?? '').trim();

  if (text === '') {
    return { lines: [''], fontSize: maxSize, lineHeight: lineHeightAt(font, maxSize), flags: [] };
  }

  // Phase 1: shrink a single line until it fits, down to the minimum size.
  for (let size = maxSize; size >= minSize; size--) {
    const w = font.widthOfTextAtSize(text, size);
    const h = lineHeightAt(font, size);
    if (w <= boxW && h <= boxH) {
      const flags = size < maxSize ? [shrunkFlag(maxSize, size)] : [];
      return { lines: [text], fontSize: size, lineHeight: h, flags };
    }
  }

  // Phase 2: at the minimum size, try wrapping into multiple lines.
  // Skipped when the field has wrapping disabled (wrap === false).
  const lineHeight = lineHeightAt(font, minSize);
  const wrapEnabled = field.wrap !== false;
  const wrapped = wrapEnabled ? wrapText(text, boxW, minSize, font) : [text];
  const totalHeight = wrapped.length * lineHeight;

  if (wrapEnabled && totalHeight <= boxH) {
    const flags = [shrunkFlag(maxSize, minSize), wrappedFlag(wrapped.length)];
    // If it never actually shrank below max we still report wrapping; but here
    // we only reach Phase 2 after exhausting shrink, so shrink is implied.
    return { lines: wrapped, fontSize: minSize, lineHeight, flags };
  }

  // Phase 3: even wrapped text overflows — truncate to the lines that fit.
  const maxLines = Math.max(1, Math.floor(boxH / lineHeight));
  const kept = wrapped.slice(0, maxLines);
  kept[kept.length - 1] = ellipsize(kept[kept.length - 1], boxW, minSize, font);

  const flags = [shrunkFlag(maxSize, minSize), truncatedFlag()];
  return { lines: kept, fontSize: minSize, lineHeight, flags };
}

function lineHeightAt(font, size) {
  return font.heightAtSize(size) * LINE_SPACING;
}

// Greedy word wrap. Words longer than the box are hard-split by character.
function wrapText(text, boxW, size, font) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= boxW || current === '') {
      if (font.widthOfTextAtSize(word, size) > boxW && current === '') {
        // Single word wider than the box: hard-split it.
        for (const piece of hardSplit(word, boxW, size, font)) {
          lines.push(piece);
        }
        current = lines.pop() ?? '';
      } else {
        current = candidate;
      }
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function hardSplit(word, boxW, size, font) {
  const pieces = [];
  let piece = '';
  for (const ch of word) {
    if (font.widthOfTextAtSize(piece + ch, size) > boxW && piece !== '') {
      pieces.push(piece);
      piece = ch;
    } else {
      piece += ch;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

// Always mark a truncated line with an ellipsis, trimming characters until
// "line…" fits inside the box width. Called only when content was dropped, so
// the ellipsis is a deliberate signal that text is missing.
function ellipsize(line, boxW, size, font) {
  const ellipsis = '…';
  let trimmed = line;
  while (
    trimmed.length > 0 &&
    font.widthOfTextAtSize(trimmed + ellipsis, size) > boxW
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + ellipsis;
}

function shrunkFlag(from, to) {
  return {
    flag_type: 'text_shrunk',
    details: `Text shrunk from ${from}pt to ${to}pt to fit in box`,
  };
}

function wrappedFlag(lineCount) {
  return {
    flag_type: 'text_wrapped',
    details: `Text wrapped onto ${lineCount} lines to fit in box`,
  };
}

function truncatedFlag() {
  return {
    flag_type: 'text_truncated',
    details: 'Text truncated with ellipsis; it did not fit even when wrapped at minimum size',
  };
}
