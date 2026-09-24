import { readJson } from '../../../shared/lib/storage';

export const SPLIT_KEY = 'jsonCleaner.split';
export const DEFAULT_SPLIT = 0.5;
export const MIN_PANEL_PX = 240;

export function clampSplit(split: number, availablePx: number): number {
  if (!Number.isFinite(split)) return DEFAULT_SPLIT;
  const min = availablePx > 0 ? Math.min(0.5, MIN_PANEL_PX / availablePx) : 0;
  return Math.min(1 - min, Math.max(min, split));
}

export function loadSplit(): number {
  const v = readJson<unknown>(SPLIT_KEY, DEFAULT_SPLIT);
  return typeof v === 'number' && v > 0 && v < 1 ? v : DEFAULT_SPLIT;
}

export function saveSplit(split: number): void {
  try {
    localStorage.setItem(SPLIT_KEY, JSON.stringify(split));
  } catch {}
}
