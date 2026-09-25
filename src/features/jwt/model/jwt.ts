import { escapeHtml } from '../../../shared/lib/dom';

export type JsonObject = Record<string, unknown>;

export type TokenStatus = 'expired' | 'not-yet-valid' | 'valid' | 'no-exp';

export type TimeClaim = 'iat' | 'nbf' | 'exp';

export interface ClaimTime {
  claim: TimeClaim;
  label: string;
  date: Date;
  relative: string;
}

export interface SensitiveClaim {
  path: string;
  reason: 'nombre' | 'email';
}

export interface JwtInfo {
  header: JsonObject;
  payload: JsonObject;
  parts: [string, string, string];
  times: ClaimTime[];
  status: TokenStatus;
  sensitive: SensitiveClaim[];
  warnings: string[];
}

export type InspectResult = { ok: true; jwt: JwtInfo } | { ok: false; error: string };

export function cleanToken(raw: string): string {
  return raw
    .trim()
    .replace(/^authorization\s*:\s*/i, '')
    .replace(/^bearer\s+/i, '')
    .replace(/\s+/g, '');
}

export function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  let bin: string;
  try {
    bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeSegment(segment: string, name: string): JsonObject | string {
  const bytes = base64UrlToBytes(segment);
  if (!bytes) return `El ${name} no es Base64URL válido.`;
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return `El ${name} no es texto UTF-8.`;
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return `El ${name} no es JSON válido.`;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `El ${name} debe ser un objeto JSON.`;
  }
  return value as JsonObject;
}

const TIME_LABELS: Record<TimeClaim, string> = {
  iat: 'Emitido (iat)',
  nbf: 'Válido desde (nbf)',
  exp: 'Expira (exp)',
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function relativeTime(targetMs: number, now: number): string {
  const diff = (targetMs - now) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs || unit === 'second') {
      return rtf.format(Math.round(diff / secs), unit);
    }
  }
  return '';
}

function numericClaim(payload: JsonObject, claim: TimeClaim): number | null {
  const v = payload[claim];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function claimTimes(payload: JsonObject, now: number): ClaimTime[] {
  const out: ClaimTime[] = [];
  for (const claim of ['iat', 'nbf', 'exp'] as const) {
    const secs = numericClaim(payload, claim);
    if (secs === null) continue;
    out.push({
      claim,
      label: TIME_LABELS[claim],
      date: new Date(secs * 1000),
      relative: relativeTime(secs * 1000, now),
    });
  }
  return out;
}

export function tokenStatus(payload: JsonObject, now: number): TokenStatus {
  const exp = numericClaim(payload, 'exp');
  const nbf = numericClaim(payload, 'nbf');
  if (exp !== null && now >= exp * 1000) return 'expired';
  if (nbf !== null && now < nbf * 1000) return 'not-yet-valid';
  return exp === null ? 'no-exp' : 'valid';
}

const SENSITIVE_KEY =
  /pass(word)?|pwd|secret|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|credit|card[_-]?number|cvv|ssn|curp/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sensitiveClaims(payload: JsonObject): SensitiveClaim[] {
  const out: SensitiveClaim[] = [];
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        const p = path ? `${path}.${k}` : k;
        if (SENSITIVE_KEY.test(k)) out.push({ path: p, reason: 'nombre' });
        else walk(v, p);
      }
    } else if (typeof value === 'string' && EMAIL.test(value)) {
      out.push({ path, reason: 'email' });
    }
  };
  walk(payload, '');
  return out;
}

export function algWarnings(header: JsonObject): string[] {
  const alg = header.alg;
  if (typeof alg !== 'string' || !alg) return ['El header no indica el algoritmo (alg).'];
  if (alg.toLowerCase() === 'none') {
    return ['El token no está firmado (alg: none): cualquiera pudo haberlo modificado.'];
  }
  return [];
}

export function inspectJwt(raw: string, now: number = Date.now()): InspectResult {
  const token = cleanToken(raw);
  if (!token) return { ok: false, error: 'Pega un JWT.' };
  const parts = token.split('.');
  if (parts.length === 5) {
    return {
      ok: false,
      error: 'Es un JWE (token cifrado): su contenido no se puede leer sin la llave.',
    };
  }
  if (parts.length !== 3) {
    return {
      ok: false,
      error: `Un JWT tiene 3 partes separadas por punto; este tiene ${parts.length}.`,
    };
  }
  const [h, p, s] = parts as [string, string, string];
  const header = decodeSegment(h, 'header');
  if (typeof header === 'string') return { ok: false, error: header };
  const payload = decodeSegment(p, 'payload');
  if (typeof payload === 'string') return { ok: false, error: payload };
  return {
    ok: true,
    jwt: {
      header,
      payload,
      parts: [h, p, s],
      times: claimTimes(payload, now),
      status: tokenStatus(payload, now),
      sensitive: sensitiveClaims(payload),
      warnings: algWarnings(header),
    },
  };
}

const PART_CLASSES = ['jwt-h', 'jwt-p', 'jwt-s'];

export function highlightJwt(text: string): string {
  return text
    .split('.')
    .map((part, i) => {
      const cls = PART_CLASSES[i];
      return cls ? `<span class="${cls}">${escapeHtml(part)}</span>` : escapeHtml(part);
    })
    .join('<span class="jwt-dot">.</span>');
}
