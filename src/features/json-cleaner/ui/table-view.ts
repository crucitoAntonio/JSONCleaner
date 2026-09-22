import type { JsonValue } from '../../../shared/types';
import { formatPrimitive, typeClass } from '../../../shared/lib/format';

function buildCellValueSimple(v: JsonValue | undefined): HTMLElement {
  if (v !== null && v !== undefined && typeof v === 'object') {
    const wrap = document.createElement('div');
    const toggle = document.createElement('span');
    toggle.className = 'tv-cell-toggle';
    const count = Array.isArray(v) ? v.length : Object.keys(v).length;
    toggle.textContent = (Array.isArray(v) ? 'Array' : 'Object') + '(' + count + ')';
    const content = document.createElement('div');
    content.className = 'tv-cell-content';
    content.hidden = true;
    let built = false;
    toggle.addEventListener('click', () => {
      content.hidden = !content.hidden;
      if (!content.hidden && !built) {
        content.appendChild(buildTableNode(v));
        built = true;
      }
    });
    wrap.appendChild(toggle);
    wrap.appendChild(content);
    return wrap;
  }
  const span = document.createElement('span');
  span.className = 'tv-primitive ' + typeClass(v);
  span.textContent = formatPrimitive(v);
  return span;
}

function buildObjectTableSimple(obj: Record<string, JsonValue>): HTMLElement {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    const s = document.createElement('span');
    s.className = 'tv-empty';
    s.textContent = '{} vacío';
    return s;
  }
  const table = document.createElement('table');
  table.className = 'tv-table';
  keys.forEach((k) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = k;
    tr.appendChild(th);
    const td = document.createElement('td');
    td.appendChild(buildCellValueSimple(obj[k]));
    tr.appendChild(td);
    table.appendChild(tr);
  });
  return table;
}

function buildArrayTableSimple(arr: JsonValue[]): HTMLElement {
  if (arr.length === 0) {
    const s = document.createElement('span');
    s.className = 'tv-empty';
    s.textContent = '[] vacío';
    return s;
  }
  const allObjects = arr.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v));
  const table = document.createElement('table');
  table.className = 'tv-table';
  if (allObjects) {
    const cols: string[] = [];
    arr.forEach((o) =>
      Object.keys(o as Record<string, JsonValue>).forEach((k) => {
        if (cols.indexOf(k) === -1) cols.push(k);
      }),
    );
    const headRow = document.createElement('tr');
    const thIdx = document.createElement('th');
    thIdx.textContent = '#';
    headRow.appendChild(thIdx);
    cols.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c;
      headRow.appendChild(th);
    });
    table.appendChild(headRow);
    arr.forEach((obj, i) => {
      const tr = document.createElement('tr');
      const tdIdx = document.createElement('td');
      tdIdx.className = 'tv-index';
      tdIdx.textContent = String(i);
      tr.appendChild(tdIdx);
      cols.forEach((c) => {
        const td = document.createElement('td');
        td.appendChild(buildCellValueSimple((obj as Record<string, JsonValue>)[c]));
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
  } else {
    arr.forEach((v, i) => {
      const tr = document.createElement('tr');
      const tdIdx = document.createElement('td');
      tdIdx.className = 'tv-index';
      tdIdx.textContent = String(i);
      tr.appendChild(tdIdx);
      const td = document.createElement('td');
      td.appendChild(buildCellValueSimple(v));
      tr.appendChild(td);
      table.appendChild(tr);
    });
  }
  return table;
}

function buildTableNode(value: JsonValue): HTMLElement {
  if (Array.isArray(value)) return buildArrayTableSimple(value);
  if (value !== null && typeof value === 'object') return buildObjectTableSimple(value);
  const span = document.createElement('span');
  span.className = 'tv-primitive ' + typeClass(value);
  span.textContent = formatPrimitive(value);
  return span;
}

export function renderTableRoot(container: HTMLElement, value: JsonValue | undefined): void {
  container.innerHTML = '';
  if (value === undefined) {
    container.innerHTML = '<div class="warn-box">Formatea un JSON válido para ver la tabla.</div>';
    return;
  }
  container.appendChild(buildTableNode(value));
}
