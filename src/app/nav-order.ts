import { readJson, writeJson } from '../shared/lib/storage';

export const NAV_ORDER_KEY = 'jsonCleaner.navOrder.v1';

export function mergeOrder(saved: unknown, defaults: string[]): string[] {
  const known = new Set(defaults);
  const kept = Array.isArray(saved)
    ? saved.filter((id): id is string => typeof id === 'string' && known.has(id))
    : [];
  const unique = kept.filter((id, i) => kept.indexOf(id) === i);
  return [...unique, ...defaults.filter((id) => !unique.includes(id))];
}

export function moveTo(order: string[], id: string, index: number): string[] {
  const others = order.filter((x) => x !== id);
  const at = Math.max(0, Math.min(index, others.length));
  return [...others.slice(0, at), id, ...others.slice(at)];
}

export function loadNavOrder(): unknown {
  return readJson<unknown>(NAV_ORDER_KEY, []);
}

export function saveNavOrder(order: string[]): void {
  try {
    writeJson(NAV_ORDER_KEY, order);
  } catch {
    return;
  }
}
