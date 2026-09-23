import { escapeHtml } from '../../../shared/lib/dom';

const KEYWORDS = new Set([
  'package',
  'import',
  'data',
  'class',
  'enum',
  'val',
  'var',
  'public',
  'private',
  'protected',
  'static',
  'final',
  'void',
  'return',
  'this',
  'null',
  'true',
  'false',
]);

// Resaltado mínimo para Kotlin/Java generado por quicktype: comentarios, strings, palabras
// clave y nombres de tipo (identificadores en PascalCase). Reusa las clases de color de la
// vista Texto del JSON Cleaner (.k/.s/.n/.b) definidas en tokens.css.
const TOKEN = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;

export function highlightCode(code: string): string {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    out += escapeHtml(code.slice(last, m.index));
    const [text, comment, str, word] = m;
    const esc = escapeHtml(text);
    if (comment) out += '<span class="code-comment">' + esc + '</span>';
    else if (str) out += '<span class="s">' + esc + '</span>';
    else if (word && KEYWORDS.has(word)) out += '<span class="b">' + esc + '</span>';
    else if (word && /^[A-Z]/.test(word)) out += '<span class="k">' + esc + '</span>';
    else out += esc;
    last = m.index + text.length;
  }
  return out + escapeHtml(code.slice(last));
}
