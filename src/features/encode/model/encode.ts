export type EncodeMode = 'base64' | 'base64url' | 'url';
export type Direction = 'encode' | 'decode';
export type CodecResult = { ok: true; text: string } | { ok: false; error: string };

export interface CodecOptions {
  plusAsSpace?: boolean;
}

export interface FileInfo {
  mime: string;
  ext: string;
  label: string;
  image: boolean;
}

export type DecodedContent =
  { kind: 'text'; text: string } | { kind: 'file'; bytes: Uint8Array<ArrayBuffer>; info: FileInfo };

export type ContentResult = { ok: true; content: DecodedContent } | { ok: false; error: string };

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

function bytesToBinary(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return bin;
}

export function bytesToBase64(bytes: Uint8Array, { urlSafe = false } = {}): string {
  const b64 = btoa(bytesToBinary(bytes));
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function encodeBase64(text: string, { urlSafe = false } = {}): string {
  return bytesToBase64(new TextEncoder().encode(text), { urlSafe });
}

export function base64ToBytes(
  input: string,
): { ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; error: string } {
  const s = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(s)) {
    return {
      ok: false,
      error: 'Tiene caracteres que no son Base64 (solo A–Z, a–z, 0–9, + / o - _, y = al final).',
    };
  }
  if (s.length % 4 === 1) {
    return { ok: false, error: 'La longitud no es válida para Base64: falta o sobra un carácter.' };
  }
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { ok: true, bytes };
}

function utf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function decodeBase64(input: string): CodecResult {
  const r = base64ToBytes(input);
  if (!r.ok) return r;
  const text = utf8(r.bytes);
  return text === null
    ? {
        ok: false,
        error:
          'Se decodificó, pero el resultado no es texto UTF-8 (probablemente es un archivo binario).',
      }
    : { ok: true, text };
}

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  return bytes.length >= offset + sig.length && sig.every((v, i) => bytes[offset + i] === v);
}

const info = (mime: string, ext: string, label: string, image: boolean): FileInfo => ({
  mime,
  ext,
  label,
  image,
});

const SIGNATURES: { match: (b: Uint8Array) => boolean; info: FileInfo }[] = [
  {
    match: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    info: info('image/png', 'png', 'PNG', true),
  },
  {
    match: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
    info: info('image/jpeg', 'jpg', 'JPEG', true),
  },
  { match: (b) => startsWith(b, ascii('GIF8')), info: info('image/gif', 'gif', 'GIF', true) },
  {
    match: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
    info: info('image/webp', 'webp', 'WebP', true),
  },
  {
    match: (b) => startsWith(b, ascii('ftypavif'), 4),
    info: info('image/avif', 'avif', 'AVIF', true),
  },
  {
    match: (b) => startsWith(b, ascii('BM')) && b.length >= 26 && startsWith(b, [0, 0, 0, 0], 6),
    info: info('image/bmp', 'bmp', 'BMP', true),
  },
  { match: (b) => startsWith(b, [0, 0, 1, 0]), info: info('image/x-icon', 'ico', 'ICO', true) },
  {
    match: (b) => startsWith(b, ascii('%PDF-')),
    info: info('application/pdf', 'pdf', 'PDF', false),
  },
  {
    match: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
    info: info('application/zip', 'zip', 'ZIP', false),
  },
  {
    match: (b) => startsWith(b, [0x1f, 0x8b]),
    info: info('application/gzip', 'gz', 'GZIP', false),
  },
];

const SVG_INFO = info('image/svg+xml', 'svg', 'SVG', true);
const BINARY_INFO = info('application/octet-stream', 'bin', 'binario', false);
const SVG_TEXT = /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i;

export function detectFileType(bytes: Uint8Array): FileInfo | null {
  return SIGNATURES.find((s) => s.match(bytes))?.info ?? null;
}

function infoFromMime(mime: string): FileInfo {
  const known = [...SIGNATURES.map((s) => s.info), SVG_INFO].find((i) => i.mime === mime);
  if (known) return known;
  const sub = mime.split('/')[1]?.replace(/^x-/, '').replace(/\+.*$/, '') || 'bin';
  return info(mime, sub, sub.toUpperCase(), mime.startsWith('image/'));
}

const DATA_URI = /^\s*data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,/i;

export function parseDataUri(
  input: string,
): { mime: string | null; base64: boolean; payload: string } | null {
  const m = DATA_URI.exec(input);
  if (!m) return null;
  return {
    mime: m[1] ? m[1].toLowerCase() : null,
    base64: !!m[3],
    payload: input.slice(m[0].length),
  };
}

export function decodeBase64Content(input: string): ContentResult {
  const dataUri = parseDataUri(input);
  let bytes: Uint8Array<ArrayBuffer>;
  if (dataUri && !dataUri.base64) {
    try {
      bytes = new TextEncoder().encode(decodeURIComponent(dataUri.payload.trim()));
    } catch {
      return { ok: false, error: 'El data URI tiene una secuencia % inválida.' };
    }
  } else {
    const r = base64ToBytes(dataUri ? dataUri.payload : input);
    if (!r.ok) return r;
    bytes = r.bytes;
  }

  const detected = detectFileType(bytes);
  if (detected) return { ok: true, content: { kind: 'file', bytes, info: detected } };

  const text = utf8(bytes);
  if (text !== null && SVG_TEXT.test(text)) {
    return { ok: true, content: { kind: 'file', bytes, info: SVG_INFO } };
  }
  const declared = dataUri?.mime ? infoFromMime(dataUri.mime) : null;
  if (declared?.image) return { ok: true, content: { kind: 'file', bytes, info: declared } };
  if (text !== null) return { ok: true, content: { kind: 'text', text } };
  return { ok: true, content: { kind: 'file', bytes, info: declared ?? BINARY_INFO } };
}

export function encodeFile(
  bytes: Uint8Array,
  mime: string,
  { urlSafe = false, dataUri = false } = {},
): string {
  if (dataUri) return `data:${mime || 'application/octet-stream'};base64,${bytesToBase64(bytes)}`;
  return bytesToBase64(bytes, { urlSafe });
}

export function fileTooLarge(size: number): string | null {
  if (size <= MAX_FILE_BYTES) return null;
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  return `El archivo pesa ${mb(size)} MB; el máximo es ${mb(MAX_FILE_BYTES)} MB.`;
}

export function encodeUrl(text: string): CodecResult {
  try {
    return { ok: true, text: encodeURIComponent(text) };
  } catch {
    return {
      ok: false,
      error: 'El texto tiene caracteres Unicode incompletos y no se puede codificar.',
    };
  }
}

export function decodeUrl(input: string, { plusAsSpace = false }: CodecOptions = {}): CodecResult {
  try {
    return {
      ok: true,
      text: decodeURIComponent(plusAsSpace ? input.replace(/\+/g, ' ') : input),
    };
  } catch {
    return {
      ok: false,
      error:
        'Hay una secuencia % inválida: cada % debe ir seguido de dos dígitos hexadecimales que formen UTF-8 válido.',
    };
  }
}

export function runCodec(
  mode: EncodeMode,
  direction: Direction,
  input: string,
  opts: CodecOptions = {},
): ContentResult {
  const asContent = (r: CodecResult): ContentResult =>
    r.ok ? { ok: true, content: { kind: 'text', text: r.text } } : r;
  if (mode === 'url') {
    return asContent(direction === 'encode' ? encodeUrl(input) : decodeUrl(input, opts));
  }
  if (direction === 'decode') return decodeBase64Content(input);
  return asContent({ ok: true, text: encodeBase64(input, { urlSafe: mode === 'base64url' }) });
}
