// Extrae JSON válido de logs pegados desde Logcat (formato breve o `-v threadtime`),
// tolerando prefijos de línea y JSON "envuelto" en texto de log.

const LOGCAT_PREFIX =
  /^\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+-\d+\s+\S+\s+\S+\s+[VDIWEFS]\s{2,}/;
const LOGCAT_THREADTIME =
  /^\s*\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+[VDIWEFS]\s+\S+:\s*/;

export function stripLogPrefix(line: string): string {
  if (LOGCAT_PREFIX.test(line)) return line.replace(LOGCAT_PREFIX, '');
  if (LOGCAT_THREADTIME.test(line)) return line.replace(LOGCAT_THREADTIME, '');
  return line;
}

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

export function extractJsonText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const concatenated = lines
    .map(stripLogPrefix)
    .filter((l) => l.length > 0)
    .join('');
  return findJsonSubstring(concatenated);
}

// Algunos logs/exportaciones escapan cada comilla `"` como `""` en vez de `\"`
// (p. ej. estilo CSV). Colapsar pares de comillas consecutivas revierte
// exactamente esa duplicación, incluyendo el caso de strings vacíos (`""""` -> `""`).
export function fixDoubledQuotes(text: string): string {
  return text.replace(/""/g, '"');
}
