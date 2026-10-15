import { joinLogLines } from './parser';

const CP1252: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

const CONT = '[\\u0080-\\u00BF' + Object.keys(CP1252).join('') + ']';
const MOJIBAKE = new RegExp('[\\u00C2-\\u00F4]' + CONT + '{1,3}', 'g');
const LONE_TILDE_A = new RegExp('Ã(?!' + CONT + ')', 'g');
const LONE_CIRC_A = new RegExp('â(?!' + CONT + ')', 'g');
const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
const MAX_UNWRAP = 3;
const LABEL = /^[A-Za-zÁ-ú][\w .\-/]{0,30}:\s*(?=["{[])/;

export interface Cleaned {
  text: string;
  notes: string[];
}

function byteOf(ch: string): number {
  const code = ch.charCodeAt(0);
  return code <= 0xff ? code : (CP1252[ch] ?? 0);
}

function decodeSequence(match: string): string {
  const lead = match.charCodeAt(0);
  const need = lead < 0xe0 ? 1 : lead < 0xf0 ? 2 : 3;
  if (match.length - 1 < need) return match;
  const bytes = Uint8Array.from(Array.from(match.slice(0, need + 1), byteOf));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes) + match.slice(need + 1);
  } catch {
    return match;
  }
}

export function fixMojibake(text: string): string {
  let converted = 0;
  const strict = text.replace(MOJIBAKE, (m) => {
    const decoded = decodeSequence(m);
    if (decoded !== m) converted++;
    return decoded;
  });
  if (converted === 0) return text;
  return strict
    .replace(LONE_TILDE_A, (_, offset: number) =>
      /[A-ZÁÉÍÓÚÑ]/.test(strict.charAt(offset + 1)) && !/\p{L}/u.test(strict.charAt(offset - 1))
        ? 'Í'
        : 'í',
    )
    .replace(LONE_CIRC_A, (_, offset: number) => {
      const next = strict.charAt(offset + 1);
      const prev = offset === 0 ? ' ' : strict.charAt(offset - 1);
      if (/\s/.test(next)) return '—';
      return /[\s([>¿¡]/.test(prev) ? '“' : '”';
    });
}

function lenientUnescape(text: string): string {
  return text.replace(/\\(u[0-9a-fA-F]{4}|[\s\S])/g, (_, e: string) =>
    e.length > 1 ? String.fromCharCode(parseInt(e.slice(1), 16)) : (ESCAPES[e] ?? e),
  );
}

function dropDanglingBackslash(text: string): string {
  const run = /\\+$/.exec(text);
  return run && run[0].length % 2 === 1 ? text.slice(0, -1) : text;
}

function stripClosingQuote(text: string): string {
  return /(?:^|[^\\])(?:\\\\)*"$/.test(text) ? text.slice(0, -1) : text;
}

function stripLabel(text: string): string {
  return text.replace(LABEL, '');
}

export function unwrapJsonString(raw: string): string | null {
  const joined = joinLogLines(raw).trim();
  const unlabeled = stripLabel(joined);
  let text = joined;
  if (/^[{[]\s*\\"/.test(unlabeled)) text = '"' + unlabeled;
  else if (unlabeled.startsWith('"')) text = unlabeled;
  if (!text.startsWith('"')) return null;
  for (let depth = 0; depth < MAX_UNWRAP && text.startsWith('"'); depth++) {
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== 'string') break;
      text = stripLabel(value.trim());
    } catch {
      text = stripLabel(
        dropDanglingBackslash(
          lenientUnescape(dropDanglingBackslash(stripClosingQuote(text.slice(1)))),
        ).trim(),
      );
    }
  }
  return /^[{[]/.test(text) ? text : null;
}

export function cleanInput(raw: string): Cleaned {
  const notes: string[] = [];
  let text = raw;
  const unwrapped = unwrapJsonString(raw);
  if (unwrapped !== null) {
    text = unwrapped;
    notes.push('texto escapado');
  }
  const fixed = fixMojibake(text);
  if (fixed !== text) {
    text = fixed;
    notes.push('acentos corregidos');
  }
  return { text, notes };
}
