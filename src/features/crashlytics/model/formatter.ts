import { TRACE_FRAME, TRACE_MORE } from './tokenizer';

interface TraceLineGroup {
  text: string;
  isFrame: boolean;
  count: number;
}

// Reacomoda indentación (4 espacios para frames "at ...") y agrupa
// líneas de frame idénticas consecutivas con un sufijo "(×N)".
export function normalizeTraceText(text: string): string {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const grouped: TraceLineGroup[] = [];
  rawLines.forEach((line) => {
    const isFrame = TRACE_FRAME.test(line) || TRACE_MORE.test(line);
    const prev = grouped[grouped.length - 1];
    if (prev && isFrame && prev.isFrame && prev.text === line) prev.count++;
    else grouped.push({ text: line, isFrame, count: 1 });
  });
  return grouped
    .map((g) => {
      const indented = g.isFrame ? '    ' + g.text : g.text;
      return g.count > 1 ? indented + '  (×' + g.count + ')' : indented;
    })
    .join('\n');
}
