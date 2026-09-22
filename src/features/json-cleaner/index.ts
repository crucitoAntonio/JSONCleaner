import './ui/json-cleaner.css';

import type { PanelMode } from './ui/panel';
import {
  formatPanel,
  panels,
  renderPanelView,
  setMode,
  setStatus,
  syncEditorScroll,
  tryParse,
  updateHighlight,
} from './ui/panel';
import { comparing, recomputeDiff, setComparing } from './ui/compare';
import { renderSidebar, saveCurrentPanel } from './ui/sidebar';
import { slugify } from '../../shared/lib/format';
import type { Side } from '../../shared/types';

function wirePanelEvents(side: Side): void {
  const panel = panels[side];

  panel.labelInput.addEventListener('input', () => {
    panel.name = panel.labelInput.value;
  });

  panel.textarea.addEventListener('input', () => {
    updateHighlight(side);
    tryParse(side);
    if (comparing) recomputeDiff();
    else renderPanelView(side);
  });
  panel.textarea.addEventListener('scroll', () => syncEditorScroll(side));

  panel.diffHeader.addEventListener('click', () => {
    panel.diffExpanded = !panel.diffExpanded;
    renderPanelView(side);
  });
  panel.textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      formatPanel(side);
    }
  });

  panel.section.querySelectorAll<HTMLButtonElement>('.mode-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => setMode(side, btn.dataset.mode as PanelMode));
  });

  panel.section
    .querySelectorAll<HTMLButtonElement>('.panel-actions button[data-action]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'format') {
          formatPanel(side);
        } else if (action === 'save') {
          saveCurrentPanel(side);
        } else if (action === 'clear') {
          panel.textarea.value = '';
          updateHighlight(side);
          panel.parsed = undefined;
          panel.valid = false;
          panel.error = null;
          setStatus(side, 'idle', 'Vacío');
          if (comparing) recomputeDiff();
          else renderPanelView(side);
        } else if (action === 'copy') {
          const text = panel.valid ? JSON.stringify(panel.parsed, null, 2) : panel.textarea.value;
          if (text) void navigator.clipboard.writeText(text);
        } else if (action === 'download') {
          const text = panel.valid ? JSON.stringify(panel.parsed, null, 2) : panel.textarea.value;
          if (!text) return;
          const blob = new Blob([text], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = slugify(panel.name) + '_' + Date.now() + '.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else if (action === 'file') {
          panel.fileInput.click();
        }
      });
    });

  panel.fileInput.addEventListener('change', () => {
    const file = panel.fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      panel.textarea.value = String(reader.result ?? '');
      formatPanel(side);
    };
    reader.readAsText(file);
    panel.fileInput.value = '';
  });
}

function wireGlobalEvents(): void {
  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      setComparing(!comparing);
      compareBtn.classList.toggle('active', comparing);
      compareBtn.title = comparing ? 'Comparando (clic para desactivar)' : 'Comparar documentos';
      recomputeDiff();
    });
  }

  const swapBtn = document.getElementById('swapBtn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const L = panels.left,
        R = panels.right;
      const tmpText = L.textarea.value;
      L.textarea.value = R.textarea.value;
      R.textarea.value = tmpText;
      updateHighlight('left');
      updateHighlight('right');
      const tmpName = L.name;
      L.name = R.name;
      R.name = tmpName;
      L.labelInput.value = L.name;
      R.labelInput.value = R.name;
      tryParse('left');
      tryParse('right');
      if (comparing) recomputeDiff();
      else {
        renderPanelView('left');
        renderPanelView('right');
      }
    });
  }

  document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('hidden');
  });
}

export function initJsonCleaner(): void {
  (['left', 'right'] as const).forEach((side) => wirePanelEvents(side));
  wireGlobalEvents();

  // El navegador puede restaurar automáticamente el contenido de los <textarea>
  // al recargar la página, sin disparar el evento 'input'. Sincronizamos la capa
  // de resaltado y el estado de parseo con lo que haya quedado en cada textarea.
  (['left', 'right'] as const).forEach((side) => {
    updateHighlight(side);
    tryParse(side);
    renderPanelView(side);
  });
  renderSidebar();
  if (window.innerWidth < 860) document.getElementById('sidebar')?.classList.add('hidden');
}
