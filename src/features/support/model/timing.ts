import { readJson } from '../../../shared/lib/storage';

export const SUPPORT_KEY = 'jsonCleaner.support.v1';
export const KOFI_URL = 'https://ko-fi.com/N8W327KI3Y';

export const FIRST_SHOW_DELAY_MS = 30_000;
export const DISMISS_MS = 5 * 60_000;
export const THANKS_MS = 30 * 24 * 60 * 60_000;

const MAX_TIMEOUT_MS = 2_147_483_647;

export type HideReason = 'dismiss' | 'donate';

export function hiddenUntilFor(reason: HideReason, current: number, now = Date.now()): number {
  return Math.max(current, now + (reason === 'dismiss' ? DISMISS_MS : THANKS_MS));
}

export function expandDelay(hiddenUntil: number, now = Date.now()): number | null {
  const delay = Math.max(FIRST_SHOW_DELAY_MS, hiddenUntil - now);
  return delay <= MAX_TIMEOUT_MS ? delay : null;
}

export function loadHiddenUntil(): number {
  const v = readJson<unknown>(SUPPORT_KEY, 0);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function saveHiddenUntil(until: number): void {
  try {
    localStorage.setItem(SUPPORT_KEY, JSON.stringify(until));
  } catch {}
}

export const GONE_KEY = 'jsonCleaner.support.gone';
export const GONE_MS = 7 * 24 * 60 * 60_000;

export function goneUntilFor(current: number, now = Date.now()): number {
  return Math.max(current, now + GONE_MS);
}

export function isGone(goneUntil: number, now = Date.now()): boolean {
  return now < goneUntil;
}

export function loadGoneUntil(): number {
  const v = readJson<unknown>(GONE_KEY, 0);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function saveGoneUntil(until: number): void {
  try {
    localStorage.setItem(GONE_KEY, JSON.stringify(until));
  } catch {}
}

export const LAUNCH_AT = new Date(2026, 10, 24).getTime();
export const UNLOCK_KEY = 'jsonCleaner.support.unlocked';

export function isLaunched(now = Date.now()): boolean {
  return now >= LAUNCH_AT;
}

export function loadUnlocked(): boolean {
  return readJson<unknown>(UNLOCK_KEY, false) === true;
}

export function saveUnlocked(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, 'true');
  } catch {}
}
