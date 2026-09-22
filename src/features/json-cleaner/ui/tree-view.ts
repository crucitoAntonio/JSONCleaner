import type { JsonValue, Side } from '../../../shared/types';
import type { DiffNode } from '../model/diff';
import { formatPrimitive, typeClass } from '../../../shared/lib/format';

function buildTreeRow(
  key: string | number | null,
  value: JsonValue | undefined,
  diffN: DiffNode | null,
  side: Side,
  depth: number,
): HTMLElement | null {
  if (diffN) {
    if (diffN.status === 'added' && side !== 'right') return null;
    if (diffN.status === 'removed' && side !== 'left') return null;
  }
  const val = diffN ? (side === 'left' ? diffN.a : diffN.b) : value;
  const wrapper = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'tree-row';
  if (
    diffN &&
    (diffN.status === 'added' || diffN.status === 'removed' || diffN.status === 'changed')
  ) {
    row.classList.add('diff-' + diffN.status);
  }
  const isContainer = val !== null && val !== undefined && typeof val === 'object';
  let toggleSpan: HTMLSpanElement | undefined;
  if (isContainer) {
    toggleSpan = document.createElement('span');
    toggleSpan.className = 'tree-toggle';
    row.appendChild(toggleSpan);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'tree-spacer';
    row.appendChild(spacer);
  }
  if (key !== null) {
    const keySpan = document.createElement('span');
    keySpan.className = 'tree-key';
    keySpan.textContent = key + ':';
    row.appendChild(keySpan);
  }
  if (isContainer && toggleSpan) {
    const obj = val as JsonValue[] | Record<string, JsonValue>;
    const count = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
    const preview = document.createElement('span');
    preview.className = 'tree-preview';
    preview.textContent = Array.isArray(obj) ? '[' + count + ']' : '{' + count + '}';
    row.appendChild(preview);
    wrapper.appendChild(row);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tree-children';
    const expandedDefault = depth < 2;
    childrenWrap.hidden = !expandedDefault;
    toggleSpan.textContent = expandedDefault ? '▾' : '▸';

    const entries: [string | number, JsonValue][] = Array.isArray(obj)
      ? obj.map((v, idx): [number, JsonValue] => [idx, v])
      : Object.entries(obj);
    entries.forEach(([k, v]) => {
      const childDiff = diffN && diffN.children ? (diffN.children[k] ?? null) : null;
      const childRow = buildTreeRow(k, v, childDiff, side, depth + 1);
      if (childRow) childrenWrap.appendChild(childRow);
    });
    wrapper.appendChild(childrenWrap);

    const toggle = toggleSpan;
    toggle.addEventListener('click', () => {
      childrenWrap.hidden = !childrenWrap.hidden;
      toggle.textContent = childrenWrap.hidden ? '▸' : '▾';
    });
  } else {
    const valSpan = document.createElement('span');
    valSpan.className = 'tree-value ' + typeClass(val);
    valSpan.textContent = formatPrimitive(val);
    row.appendChild(valSpan);
    wrapper.appendChild(row);
  }
  return wrapper;
}

export function renderTreeRoot(
  container: HTMLElement,
  value: JsonValue | undefined,
  diffRoot: DiffNode | null,
  side: Side,
): void {
  container.innerHTML = '';
  if (value === undefined) {
    container.innerHTML = '<div class="warn-box">Formatea un JSON válido para ver el árbol.</div>';
    return;
  }
  if (value !== null && typeof value === 'object') {
    const entries: [string | number, JsonValue][] = Array.isArray(value)
      ? value.map((v, idx): [number, JsonValue] => [idx, v])
      : Object.entries(value);
    entries.forEach(([k, v]) => {
      const childDiff = diffRoot && diffRoot.children ? (diffRoot.children[k] ?? null) : null;
      const row = buildTreeRow(k, v, childDiff, side, 0);
      if (row) container.appendChild(row);
    });
  } else {
    const row = buildTreeRow(null, value, diffRoot, side, 0);
    if (row) container.appendChild(row);
  }
}
