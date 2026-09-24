import { readJson } from '../../../shared/lib/storage';

// Borrador: el texto y nombre de ambos paneles, para que recargar la página no los pierda.
// Clave aparte de los documentos guardados (saved-docs.ts); renombrarla solo pierde el borrador.
export const DRAFT_KEY = 'jsonCleaner.draft.v1';
// Tope en caracteres (lo que cuenta la cuota de localStorage): un borrador enorme no debe
// quitarle espacio a los documentos guardados. Arriba de esto el borrador simplemente no se guarda.
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

/** Valida lo leído de localStorage; cualquier cosa con otra forma se descarta. */
export function parseDraft(raw: unknown): Draft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { left, right } = raw as Partial<Draft>;
  return isDraftPanel(left) && isDraftPanel(right) ? { left, right } : null;
}

/** JSON a guardar, o null si el borrador está vacío o excede DRAFT_MAX_CHARS. */
export function serializeDraft(draft: Draft): string | null {
  if (!draft.left.text && !draft.right.text) return null;
  const json = JSON.stringify(draft);
  return json.length <= DRAFT_MAX_CHARS ? json : null;
}

export function loadDraft(): Draft | null {
  return parseDraft(readJson<unknown>(DRAFT_KEY, null));
}

/** Nunca lanza: si no cabe (o no hay localStorage) se borra el borrador viejo y listo. */
export function saveDraft(draft: Draft): void {
  const json = serializeDraft(draft);
  try {
    if (json === null) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, json);
  } catch {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Sin localStorage: el texto solo dura mientras la pestaña siga abierta.
    }
  }
}
