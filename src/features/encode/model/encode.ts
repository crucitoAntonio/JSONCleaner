export type EncodeMode = 'base64' | 'base64url' | 'url';
export type Direction = 'encode' | 'decode';
export type CodecResult = { ok: true; text: string } | { ok: false; error: string };

export interface CodecOptions {
  plusAsSpace?: boolean;
}

function bytesToBinary(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return bin;
}

export function encodeBase64(text: string, { urlSafe = false } = {}): string {
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(text)));
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function decodeBase64(input: string): CodecResult {
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
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return {
      ok: false,
      error:
        'Se decodificó, pero el resultado no es texto UTF-8 (probablemente es un archivo binario).',
    };
  }
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
): CodecResult {
  if (mode === 'url') return direction === 'encode' ? encodeUrl(input) : decodeUrl(input, opts);
  if (direction === 'decode') return decodeBase64(input);
  return { ok: true, text: encodeBase64(input, { urlSafe: mode === 'base64url' }) };
}
