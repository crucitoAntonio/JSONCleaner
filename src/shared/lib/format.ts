import type { JsonValue } from '../types';

export type PrimitiveTypeClass = 'tv-null' | 'tv-string' | 'tv-number' | 'tv-boolean' | '';

export function typeClass(v: JsonValue | undefined): PrimitiveTypeClass {
  if (v === null) return 'tv-null';
  const t = typeof v;
  if (t === 'string') return 'tv-string';
  if (t === 'number') return 'tv-number';
  if (t === 'boolean') return 'tv-boolean';
  return '';
}

export function formatPrimitive(v: JsonValue | undefined): string {
  if (v === null) return 'null';
  if (v === undefined) return '';
  if (typeof v === 'string') return JSON.stringify(v);
  return String(v);
}

export function formatBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function slugify(name: string): string {
  const noDiacritics = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const s = noDiacritics
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'documento';
}
