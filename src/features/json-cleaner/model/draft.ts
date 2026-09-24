import { readJson } from '../../../shared/lib/storage';

export const DRAFT_KEY = 'jsonCleaner.draft.v1';
export const DRAFT_MAX_CHARS = 1_000_000;

export interface DraftPanel {
  text: string;
  name: string;
}

export interface Draft {
  left: DraftPanel;
  right: DraftPanel;
}

function isDraftPanel(v: unknown): v is DraftPanel {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as DraftPanel).text === 'string' &&
    typeof (v as DraftPanel).name === 'string'
  );
}

export function parseDraft(raw: unknown): Draft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { left, right } = raw as Partial<Draft>;
  return isDraftPanel(left) && isDraftPanel(right) ? { left, right } : null;
}

export function serializeDraft(draft: Draft): string | null {
  if (!draft.left.text && !draft.right.text) return null;
  const json = JSON.stringify(draft);
  return json.length <= DRAFT_MAX_CHARS ? json : null;
}

export function loadDraft(): Draft | null {
  return parseDraft(readJson<unknown>(DRAFT_KEY, null));
}

export function saveDraft(draft: Draft): void {
  const json = serializeDraft(draft);
  try {
    if (json === null) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, json);
  } catch {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }
}
