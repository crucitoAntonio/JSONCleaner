import type { DiffNode } from '../model/diff';
import { countDiffStats, diffNode } from '../model/diff';
import type { LineOp } from '../model/diff-lines';
import { diffLines } from '../model/diff-lines';
import { panels, renderPanelView } from './panel';

export interface TextDiffOps {
  left: LineOp[];
  right: LineOp[];
}

// Estado derivado de la comparación entre el panel izquierdo y derecho.
// panel.ts lo lee (renderPanelView) y compare.ts lo recalcula (recomputeDiff);
// la dependencia circular entre ambos módulos es intencional: reflejan el mismo
// flujo que en el script original (formatear/tipear un panel puede disparar un
// recálculo de diff, y el diff necesita re-renderizar ambos paneles).
export let comparing = false;
export let diffRoot: DiffNode | null = null;
export let textDiffOps: TextDiffOps | null = null;

export function setComparing(value: boolean): void {
  comparing = value;
}

function updateDiffBadge(): void {
  const badge = document.getElementById('diffBadge');
  const legend = document.getElementById('legend');
  if (!badge || !legend) return;
  if (!comparing) {
    badge.hidden = true;
    legend.hidden = true;
    return;
  }
  legend.hidden = false;
  if (!diffRoot) {
    badge.hidden = false;
    badge.textContent = 'Ambos documentos deben ser JSON válido';
    return;
  }
  const stats = countDiffStats(diffRoot);
  badge.hidden = false;
  badge.textContent =
    stats.added + ' agregadas · ' + stats.removed + ' eliminadas · ' + stats.changed + ' cambiadas';
}

export function recomputeDiff(): void {
  const L = panels.left,
    R = panels.right;
  if (comparing && L.valid && R.valid) {
    diffRoot = diffNode(L.parsed, R.parsed);
    const leftPretty = JSON.stringify(L.parsed, null, 2);
    const rightPretty = JSON.stringify(R.parsed, null, 2);
    const result = diffLines(leftPretty, rightPretty);
    textDiffOps = result ? { left: result.aOps, right: result.bOps } : null;
  } else {
    diffRoot = null;
    textDiffOps = null;
  }
  updateDiffBadge();
  renderPanelView('left');
  renderPanelView('right');
}
