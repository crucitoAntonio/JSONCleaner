import type { JsonValue } from '../../../shared/types';

export type DiffStatus = 'equal' | 'added' | 'removed' | 'changed' | 'container-changed';

export interface DiffNode {
  status: DiffStatus;
  a: JsonValue | undefined;
  b: JsonValue | undefined;
  children: Record<string, DiffNode> | null;
  isArray?: boolean;
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
}

export function diffNode(a: JsonValue | undefined, b: JsonValue | undefined): DiffNode {
  const aU = a === undefined,
    bU = b === undefined;
  if (aU && bU) return { status: 'equal', a, b, children: null };
  if (aU) return { status: 'added', a, b, children: null };
  if (bU) return { status: 'removed', a, b, children: null };
  const aArr = Array.isArray(a),
    bArr = Array.isArray(b);
  const aObj = a !== null && typeof a === 'object';
  const bObj = b !== null && typeof b === 'object';
  if (aObj && bObj && aArr === bArr) {
    const children: Record<string, DiffNode> = {};
    let changed = false;
    if (aArr && bArr) {
      const len = Math.max(a.length, b.length);
      for (let idx = 0; idx < len; idx++) {
        const c = diffNode(a[idx], b[idx]);
        children[idx] = c;
        if (c.status !== 'equal') changed = true;
      }
    } else {
      const aObjVal = a as Record<string, JsonValue>;
      const bObjVal = b as Record<string, JsonValue>;
      const keys = new Set([...Object.keys(aObjVal), ...Object.keys(bObjVal)]);
      keys.forEach((k) => {
        const c = diffNode(aObjVal[k], bObjVal[k]);
        children[k] = c;
        if (c.status !== 'equal') changed = true;
      });
    }
    return { status: changed ? 'container-changed' : 'equal', a, b, children, isArray: aArr };
  }
  const eq = JSON.stringify(a) === JSON.stringify(b);
  return { status: eq ? 'equal' : 'changed', a, b, children: null };
}

export function countDiffStats(node: DiffNode | null | undefined, stats?: DiffStats): DiffStats {
  stats = stats || { added: 0, removed: 0, changed: 0 };
  if (!node) return stats;
  if (node.status === 'added') stats.added++;
  else if (node.status === 'removed') stats.removed++;
  else if (node.status === 'changed') stats.changed++;
  else if (node.children) {
    Object.keys(node.children).forEach((k) => countDiffStats(node.children![k], stats));
  }
  return stats;
}
