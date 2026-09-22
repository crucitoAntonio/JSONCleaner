import type { Side } from '../../../shared/types';
import { formatBytes } from '../../../shared/lib/format';
import type { SavedDoc } from '../model/saved-docs';
import {
  STORAGE_SOFT_LIMIT,
  getStorageUsageBytes,
  loadSavedDocs,
  makeDocId,
  persistSavedDocs,
} from '../model/saved-docs';
import { formatPanel, panels } from './panel';

function updatePanelLabel(side: Side): void {
  panels[side].labelInput.value = panels[side].name;
}

export function updateStorageMeter(): void {
  const bar = document.getElementById('storageMeterBar');
  const label = document.getElementById('storageMeterLabel');
  if (!bar || !label) return;
  const bytes = getStorageUsageBytes();
  const pct = Math.min(100, (bytes / STORAGE_SOFT_LIMIT) * 100);
  bar.style.width = pct + '%';
  bar.classList.remove('warn', 'danger');
  label.classList.remove('warn');
  if (pct >= 100) {
    bar.classList.add('danger');
    label.classList.add('warn');
    label.textContent =
      formatBytes(bytes) +
      ' / ' +
      formatBytes(STORAGE_SOFT_LIMIT) +
      ' — límite alcanzado, borra documentos viejos';
  } else if (pct >= 80) {
    bar.classList.add('warn');
    label.classList.add('warn');
    label.textContent =
      formatBytes(bytes) +
      ' / ' +
      formatBytes(STORAGE_SOFT_LIMIT) +
      ' — casi lleno, considera borrar documentos viejos';
  } else {
    label.textContent = formatBytes(bytes) + ' / ' + formatBytes(STORAGE_SOFT_LIMIT) + ' usados';
  }
}

export function saveCurrentPanel(side: Side): void {
  const panel = panels[side];
  const content = panel.valid ? JSON.stringify(panel.parsed, null, 2) : panel.textarea.value;
  if (!content.trim()) {
    alert('No hay contenido para guardar en ' + panel.name + '.');
    return;
  }
  const proposed = prompt('Nombre para guardar este documento:', panel.name);
  if (!proposed) return;
  const name = proposed.trim();
  if (!name) return;
  const list = loadSavedDocs();
  const existingIdx = list.findIndex((d) => d.name === name);
  if (
    existingIdx >= 0 &&
    !confirm('Ya existe un documento guardado con el nombre "' + name + '". ¿Sobrescribir?')
  )
    return;
  const entry: SavedDoc = {
    id: existingIdx >= 0 ? list[existingIdx]!.id : makeDocId(),
    name,
    content,
    savedAt: Date.now(),
  };
  if (existingIdx >= 0) list[existingIdx] = entry;
  else list.unshift(entry);
  try {
    persistSavedDocs(list);
  } catch {
    alert(
      'No hay espacio suficiente para guardar. Borra algunos documentos viejos e intenta de nuevo.',
    );
    return;
  }
  renderSidebar();
  panel.name = name;
  updatePanelLabel(side);
}

function deleteSavedDoc(id: string): void {
  if (!confirm('¿Eliminar este documento guardado? Esta acción no se puede deshacer.')) return;
  persistSavedDocs(loadSavedDocs().filter((d) => d.id !== id));
  renderSidebar();
}

function renameSavedDoc(id: string): void {
  const list = loadSavedDocs();
  const doc = list.find((d) => d.id === id);
  if (!doc) return;
  const newName = prompt('Nuevo nombre:', doc.name);
  if (!newName || !newName.trim()) return;
  doc.name = newName.trim();
  persistSavedDocs(list);
  renderSidebar();
}

function loadSavedDocIntoPanel(id: string, side: Side): void {
  const doc = loadSavedDocs().find((d) => d.id === id);
  if (!doc) return;
  const panel = panels[side];
  panel.textarea.value = doc.content;
  panel.name = doc.name;
  updatePanelLabel(side);
  formatPanel(side);
}

export function renderSidebar(): void {
  updateStorageMeter();
  const list = loadSavedDocs().sort((a, b) => b.savedAt - a.savedAt);
  const listEl = document.getElementById('sidebarList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (list.length === 0) {
    listEl.innerHTML =
      '<div class="sidebar-empty">Aún no hay documentos guardados.<br>Usa el botón "Guardar" en cualquiera de los paneles.</div>';
    return;
  }
  list.forEach((doc) => {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = doc.name;

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent =
      new Date(doc.savedAt).toLocaleString() + ' · ' + formatBytes(doc.content.length);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btnA = document.createElement('button');
    btnA.className = 'small icon-btn';
    btnA.textContent = '🅰️';
    btnA.title = 'Abrir en el panel izquierdo (A)';
    btnA.addEventListener('click', () => loadSavedDocIntoPanel(doc.id, 'left'));

    const btnB = document.createElement('button');
    btnB.className = 'small icon-btn';
    btnB.textContent = '🅱️';
    btnB.title = 'Abrir en el panel derecho (B)';
    btnB.addEventListener('click', () => loadSavedDocIntoPanel(doc.id, 'right'));

    const btnRen = document.createElement('button');
    btnRen.className = 'small icon-btn';
    btnRen.textContent = '✎';
    btnRen.title = 'Renombrar';
    btnRen.addEventListener('click', () => renameSavedDoc(doc.id));

    const btnDel = document.createElement('button');
    btnDel.className = 'small icon-btn';
    btnDel.textContent = '🗑';
    btnDel.title = 'Eliminar';
    btnDel.addEventListener('click', () => deleteSavedDoc(doc.id));

    actions.appendChild(btnA);
    actions.appendChild(btnB);
    actions.appendChild(btnRen);
    actions.appendChild(btnDel);

    item.appendChild(nameEl);
    item.appendChild(metaEl);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}
