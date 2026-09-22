// Helpers genéricos sobre localStorage con manejo de errores (cuota excedida, JSON corrupto).

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Lanza si se excede la cuota del navegador; el llamador decide cómo avisar al usuario. */
export function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function bytesUsed(key: string): number {
  return new Blob([localStorage.getItem(key) || '']).size;
}
