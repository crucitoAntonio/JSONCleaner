// Extrae JSON válido de logs pegados desde Logcat (formato breve o `-v threadtime`),
// tolerando prefijos de línea y JSON "envuelto" en texto de log.

import { stripLogPrefix } from '../../../shared/lib/logcat';

export function findJsonSubstring(text: string): string {
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      start = i;
      break;
    }
  }
  if (start === -1) return text;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

export function joinLogLines(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map(stripLogPrefix)
    .filter((l) => l.length > 0)
    .join('');
}

export function extractJsonText(raw: string): string {
  return findJsonSubstring(joinLogLines(raw));
}

const MAX_CANDIDATES = 20;

export function findParsableJson(text: string): string | null {
  let tried = 0;
  for (let i = 0; i < text.length && tried < MAX_CANDIDATES; i++) {
    if (text[i] !== '{' && text[i] !== '[') continue;
    tried++;
    const candidate = findJsonSubstring(text.slice(i));
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      i += candidate.length - 1;
    }
  }
  return null;
}

// Algunos logs/exportaciones escapan cada comilla `"` como `""` en vez de `\"`
// (p. ej. estilo CSV). Colapsar pares de comillas consecutivas revierte
// exactamente esa duplicación, incluyendo el caso de strings vacíos (`""""` -> `""`).
export function fixDoubledQuotes(text: string): string {
  return text.replace(/""/g, '"');
}

const EMBEDDED_MARKER = /objToStrJSON\s*:\s*(?=[{[])/;

export function findEmbeddedJson(text: string): string | null {
  const m = EMBEDDED_MARKER.exec(text);
  return m ? findJsonSubstring(text.slice(m.index + m[0].length)) : null;
}

export function unescapeQuotes(text: string): string {
  return text.replace(/\\(["\\])/g, '$1');
}
