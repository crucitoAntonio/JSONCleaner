import type { JsonValue, Side } from '../../../shared/types';
import { extractJsonText, fixDoubledQuotes } from '../model/parser';
import { syntaxHighlightText } from '../model/highlight';
import { comparing, diffRoot, textDiffOps, recomputeDiff } from './compare';
import { renderTreeRoot } from './tree-view';
import { renderTableRoot } from './table-view';
import { otherSide } from '../../../shared/types';

export type PanelMode = 'text' | 'tree' | 'table';
export type StatusKind = 'ok' | 'err' | 'idle';

export interface PanelState {
  side: Side;
  section: HTMLElement;
  textarea: HTMLTextAreaElement;
  highlightLayer: HTMLElement;
  treeEl: HTMLElement;
  tableEl: HTMLElement;
  textViewWrap: HTMLElement;
  diffBlock: HTMLElement;
  diffHeader: HTMLElement;
  diffToggleIcon: HTMLElement;
  diffPreWrap: HTMLElement;
  statusEl: HTMLElement;
  fileInput: HTMLInputElement;
  labelInput: HTMLInputElement;
  name: string;
  mode: PanelMode;
  diffExpanded: boolean;
  parsed: JsonValue | undefined;
  valid: boolean;
  error: string | null;
}

function q<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error('Elemento no encontrado en el panel: ' + selector);
  return el as T;
}

function buildPanel(side: Side): PanelState {
  const section = q<HTMLElement>(document, '.doc-panel[data-side="' + side + '"]');
  return {
    side,
    section,
    textarea: q(section, 'textarea.editor'),
    highlightLayer: q(section, '.highlight-layer'),
    treeEl: q(section, '.tree-view'),
    tableEl: q(section, '.table-view'),
    textViewWrap: q(section, '.text-view-wrap'),
    diffBlock: q(section, '.diff-preview-block'),
    diffHeader: q(section, '.diff-preview-header'),
    diffToggleIcon: q(section, '.diff-toggle-icon'),
    diffPreWrap: q(section, '.diff-pre-wrap'),
    statusEl: q(section, '.status'),
    fileInput: q(section, '.file-input'),
    labelInput: q(section, '.panel-label-input'),
    name: side === 'left' ? 'Documento A' : 'Documento B',
    mode: 'text',
    diffExpanded: false,
    parsed: undefined,
    valid: false,
    error: null,
  };
}

export const panels: Record<Side, PanelState> = {
  left: buildPanel('left'),
  right: buildPanel('right'),
};

export function setStatus(side: Side, kind: StatusKind, text: string): void {
  const el = panels[side].statusEl;
  el.textContent = text;
  el.style.background =
    kind === 'ok' ? 'var(--ok-bg)' : kind === 'err' ? 'var(--error-bg)' : 'var(--idle-bg)';
  el.style.color =
    kind === 'ok' ? 'var(--ok-text)' : kind === 'err' ? 'var(--error-text)' : 'var(--idle-text)';
}

export function tryParse(side: Side): boolean {
  const panel = panels[side];
  const raw = panel.textarea.value;
  if (!raw.trim()) {
    panel.valid = false;
    panel.parsed = undefined;
    panel.error = null;
    setStatus(side, 'idle', 'Vacío');
    return false;
  }
  const jsonText = extractJsonText(raw);
  try {
    panel.parsed = JSON.parse(jsonText) as JsonValue;
    panel.valid = true;
    panel.error = null;
    setStatus(side, 'ok', 'JSON válido');
    return true;
  } catch (e) {
    const fixedText = fixDoubledQuotes(jsonText);
    if (fixedText !== jsonText) {
      try {
        panel.parsed = JSON.parse(fixedText) as JsonValue;
        panel.valid = true;
        panel.error = null;
        setStatus(side, 'ok', 'JSON válido (comillas dobles corregidas)');
        return true;
      } catch {
        /* sigue inválido, cae al manejo de error de abajo */
      }
    }
    panel.valid = false;
    panel.parsed = undefined;
    panel.error = e instanceof Error ? e.message : String(e);
    setStatus(side, 'err', 'JSON inválido');
    return false;
  }
}

export function renderPanelView(side: Side): void {
  const panel = panels[side];
  if (panel.mode === 'text') {
    const bothValid = comparing && panel.valid && panels[otherSide(side)].valid;
    panel.diffBlock.hidden = !bothValid;
    if (bothValid) {
      panel.diffBlock.classList.toggle('collapsed', !panel.diffExpanded);
      panel.diffToggleIcon.textContent = panel.diffExpanded ? '▾' : '▸';
      if (panel.diffExpanded) {
        panel.diffPreWrap.innerHTML = '';
        if (textDiffOps) {
          const pre = document.createElement('pre');
          pre.className = 'diff-pre';
          textDiffOps[side].forEach((op) => {
            const div = document.createElement('div');
            div.className =
              'diff-line' +
              (op.type !== 'equal' ? ' diff-' + (op.type === 'remove' ? 'removed' : 'added') : '');
            div.innerHTML = syntaxHighlightText(op.text) || '&nbsp;';
            pre.appendChild(div);
          });
          panel.diffPreWrap.appendChild(pre);
        } else {
          panel.diffPreWrap.innerHTML =
            '<div class="diff-note">Documentos muy grandes para el diff línea por línea. Usa la vista Árbol.</div>';
        }
      }
    }
  } else if (panel.mode === 'tree') {
    renderTreeRoot(panel.treeEl, panel.parsed, comparing ? diffRoot : null, side);
  } else if (panel.mode === 'table') {
    renderTableRoot(panel.tableEl, panel.parsed);
    if (comparing) {
      const note = document.createElement('div');
      note.className = 'warn-box';
      note.textContent =
        'El resaltado de diferencias no está disponible en la vista de Tabla. Usa Árbol o Texto.';
      panel.tableEl.prepend(note);
    }
  }
}

export function setMode(side: Side, mode: PanelMode): void {
  const panel = panels[side];
  panel.mode = mode;
  panel.section.querySelectorAll<HTMLButtonElement>('.mode-tabs button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  panel.textViewWrap.hidden = mode !== 'text';
  panel.treeEl.hidden = mode !== 'tree';
  panel.tableEl.hidden = mode !== 'table';
  renderPanelView(side);
}

export function updateHighlight(side: Side): void {
  const panel = panels[side];
  const text = panel.textarea.value;
  panel.highlightLayer.innerHTML = text ? syntaxHighlightText(text) + '\n' : '';
}

export function syncEditorScroll(side: Side): void {
  const panel = panels[side];
  panel.highlightLayer.scrollTop = panel.textarea.scrollTop;
  panel.highlightLayer.scrollLeft = panel.textarea.scrollLeft;
}

export function formatPanel(side: Side): void {
  const panel = panels[side];
  if (tryParse(side)) {
    panel.textarea.value = JSON.stringify(panel.parsed, null, 2);
  }
  updateHighlight(side);
  if (comparing) recomputeDiff();
  else renderPanelView(side);
}
