import { bytesUsed, readJson, writeJson } from '../../../shared/lib/storage';

export interface SavedDoc {
  id: string;
  name: string;
  content: string;
  savedAt: number;
}

export const STORAGE_KEY = 'jsonCleaner.savedDocs.v1';
export const STORAGE_SOFT_LIMIT = 3 * 1024 * 1024; // 3 MB, aviso antes del límite real del navegador (~5-10MB)

export function loadSavedDocs(): SavedDoc[] {
  return readJson<SavedDoc[]>(STORAGE_KEY, []);
}

export function persistSavedDocs(list: SavedDoc[]): void {
  writeJson(STORAGE_KEY, list);
}

export function getStorageUsageBytes(): number {
  return bytesUsed(STORAGE_KEY);
}

export function makeDocId(): string {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/** Inserta al inicio o, si ya existe un documento con ese nombre, lo reemplaza conservando su id. */
export function upsertDoc(list: SavedDoc[], name: string, content: string): SavedDoc[] {
  const existingIdx = list.findIndex((d) => d.name === name);
  const entry: SavedDoc = {
    id: existingIdx >= 0 ? list[existingIdx]!.id : makeDocId(),
    name,
    content,
    savedAt: Date.now(),
  };
  const next = [...list];
  if (existingIdx >= 0) next[existingIdx] = entry;
  else next.unshift(entry);
  return next;
}
