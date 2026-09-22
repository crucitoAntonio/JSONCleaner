export type LineOpType = 'equal' | 'add' | 'remove';

export interface LineOp {
  type: LineOpType;
  text: string;
}

export interface LineDiffResult {
  aOps: LineOp[];
  bOps: LineOp[];
}

// Diff clásico O(n·m) por LCS sobre el texto formateado de ambos documentos.
// Se aborta (devuelve null) por encima de un umbral de celdas para documentos muy grandes.
export function diffLines(aText: string, bText: string): LineDiffResult | null {
  const aLines = aText.split('\n');
  const bLines = bText.split('\n');
  const n = aLines.length,
    m = bLines.length;
  if (n * m > 9000000) return null;
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        aLines[i] === bLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const aOps: LineOp[] = [],
    bOps: LineOp[] = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      aOps.push({ type: 'equal', text: aLines[i]! });
      bOps.push({ type: 'equal', text: bLines[j]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      aOps.push({ type: 'remove', text: aLines[i]! });
      i++;
    } else {
      bOps.push({ type: 'add', text: bLines[j]! });
      j++;
    }
  }
  while (i < n) {
    aOps.push({ type: 'remove', text: aLines[i]! });
    i++;
  }
  while (j < m) {
    bOps.push({ type: 'add', text: bLines[j]! });
    j++;
  }
  return { aOps, bOps };
}
