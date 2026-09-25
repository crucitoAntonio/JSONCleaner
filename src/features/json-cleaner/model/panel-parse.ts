import { jsonrepair } from 'jsonrepair';
import type { JsonValue } from '../../../shared/types';
import { stripLogPrefix } from '../../../shared/lib/logcat';
import { extractJsonText, findJsonSubstring, fixDoubledQuotes } from './parser';

export type StatusKind = 'ok' | 'err' | 'idle';

export interface PanelParse {
  parsed: JsonValue | undefined;
  valid: boolean;
  error: string | null;
  status: { kind: StatusKind; text: string };
}

// Parseo "leniente en la entrada": quita prefijos de logcat, localiza el primer {...}/[...]
// balanceado y, si falla, reintenta deshaciendo el escape CSV de comillas dobles ("").
export function parsePanelText(raw: string): PanelParse {
  if (!raw.trim()) {
    return {
      parsed: undefined,
      valid: false,
      error: null,
      status: { kind: 'idle', text: 'Vacío' },
    };
  }
  const jsonText = extractJsonText(raw);
  try {
    return {
      parsed: JSON.parse(jsonText) as JsonValue,
      valid: true,
      error: null,
      status: { kind: 'ok', text: 'JSON válido' },
    };
  } catch (e) {
    const fixedText = fixDoubledQuotes(jsonText);
    if (fixedText !== jsonText) {
      try {
        return {
          parsed: JSON.parse(fixedText) as JsonValue,
          valid: true,
          error: null,
          status: { kind: 'ok', text: 'JSON válido (comillas dobles corregidas)' },
        };
      } catch {
        /* sigue inválido, cae al manejo de error de abajo */
      }
    }
    return {
      parsed: undefined,
      valid: false,
      error: e instanceof Error ? e.message : String(e),
      status: { kind: 'err', text: 'JSON inválido' },
    };
  }
}

// Último recurso, solo con permiso del usuario: jsonrepair arregla comas sobrantes, comillas
// simples, claves sin comillas, comentarios, JSON truncado, etc. Devuelve el valor reparado, o
// null si ni así se puede (o si el texto ya era válido y no hay nada que reparar).
export function repairJson(raw: string): JsonValue | null {
  if (!raw.trim() || parsePanelText(raw).valid) return null;
  // extractJsonText une las líneas sin '\n' (reconstruye JSON partido entre líneas de logcat),
  // pero así un comentario `//` se tragaría el resto del documento. Se prueban ambas uniones y
  // gana la reparación que conserva más contenido.
  const withNewlines = findJsonSubstring(raw.split(/\r?\n/).map(stripLogPrefix).join('\n'));
  let best: { value: JsonValue; size: number } | null = null;
  for (const candidate of [extractJsonText(raw), withNewlines]) {
    try {
      const value = JSON.parse(jsonrepair(candidate)) as JsonValue;
      const size = JSON.stringify(value).length;
      if (!best || size > best.size) best = { value, size };
    } catch {
      /* este candidato no se pudo reparar */
    }
  }
  return best ? best.value : null;
}
