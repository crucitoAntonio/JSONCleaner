import { TRACE_CYCLE, TRACE_FRAME, TRACE_MORE, TRACE_REPEAT_SUFFIX } from './tokenizer';

interface TraceLine {
  kind: 'line';
  text: string;
  isFrame: boolean;
  count: number;
}

/** Bloque de frames que se repite `reps` veces seguidas (recursión A→B→A→B...). */
interface TraceCycle {
  kind: 'cycle';
  reps: number;
  lines: TraceLine[];
}

type TraceItem = TraceLine | TraceCycle;

// Ciclos de hasta 20 frames: cubre la recursión mutua típica (2-5 frames) y cadenas más largas
// como el despacho de eventos entre ViewGroups, sin volver cuadrático el caso normal.
const MAX_CYCLE_LENGTH = 20;

function sameLine(a: TraceItem | undefined, b: TraceItem | undefined): boolean {
  return (
    a?.kind === 'line' &&
    b?.kind === 'line' &&
    a.isFrame &&
    b.isFrame &&
    a.text === b.text &&
    a.count === b.count
  );
}

// Lee las líneas agrupando frames idénticos consecutivos en uno con `count`. Acepta también
// texto ya formateado (sufijos "(×N)" y encabezados de ciclo), así formatear dos veces no
// cambia el resultado.
function readItems(text: string): TraceItem[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items: TraceItem[] = [];
  let cycle: { item: TraceCycle; remaining: number } | null = null;

  for (const raw of rawLines) {
    const cycleMatch = raw.match(TRACE_CYCLE);
    if (cycleMatch) {
      const item: TraceCycle = { kind: 'cycle', reps: Number(cycleMatch[1]), lines: [] };
      items.push(item);
      cycle = { item, remaining: Number(cycleMatch[2]) };
      continue;
    }
    const repeatMatch = raw.match(TRACE_REPEAT_SUFFIX);
    const line = repeatMatch ? raw.slice(0, repeatMatch.index) : raw;
    const count = repeatMatch ? Number(repeatMatch[1]) : 1;
    const isFrame = TRACE_FRAME.test(line) || TRACE_MORE.test(line);

    if (cycle && isFrame && cycle.remaining > 0) {
      cycle.item.lines.push({ kind: 'line', text: line, isFrame, count });
      if (--cycle.remaining === 0) cycle = null;
      continue;
    }
    cycle = null;

    const prev = items[items.length - 1];
    if (prev?.kind === 'line' && isFrame && prev.isFrame && prev.text === line) prev.count += count;
    else items.push({ kind: 'line', text: line, isFrame, count });
  }
  return items;
}

// Busca, desde cada posición, el bloque de 2..MAX_CYCLE_LENGTH frames que más líneas cubre al
// repetirse seguido (mínimo 2 veces) y lo reemplaza por un solo ciclo.
function collapseCycles(items: TraceItem[]): TraceItem[] {
  const out: TraceItem[] = [];
  let i = 0;
  while (i < items.length) {
    let best = { length: 0, reps: 0 };
    for (let k = 2; k <= MAX_CYCLE_LENGTH && i + 2 * k <= items.length; k++) {
      let blockOk = true;
      for (let j = 0; j < k && blockOk; j++) blockOk = sameLine(items[i + j], items[i + j]);
      if (!blockOk) break; // el bloque ya incluye algo que no es frame; uno más largo también.
      let reps = 1;
      while (i + (reps + 1) * k <= items.length) {
        let match = true;
        for (let j = 0; j < k && match; j++)
          match = sameLine(items[i + j], items[i + reps * k + j]);
        if (!match) break;
        reps++;
      }
      if (reps >= 2 && reps * k > best.length * best.reps) best = { length: k, reps };
    }
    if (best.reps >= 2) {
      out.push({
        kind: 'cycle',
        reps: best.reps,
        lines: items.slice(i, i + best.length) as TraceLine[],
      });
      i += best.length * best.reps;
    } else {
      out.push(items[i]!);
      i++;
    }
  }
  return out;
}

function renderLine(line: TraceLine, indent: string): string {
  const text = line.isFrame ? indent + line.text : line.text;
  return line.count > 1 ? text + '  (×' + line.count + ')' : text;
}

// Reacomoda indentación (4 espacios para frames "at ..."), agrupa frames idénticos
// consecutivos con un sufijo "(×N)" y colapsa bloques de frames que se repiten seguidos
// (recursión mutua) en un encabezado "↻ Se repite N veces (K frames):" + el bloque, con
// 6 espacios de indentación.
export function normalizeTraceText(text: string): string {
  return collapseCycles(readItems(text))
    .map((item) =>
      item.kind === 'line'
        ? renderLine(item, '    ')
        : [
            '    ↻ Se repite ' + item.reps + ' veces (' + item.lines.length + ' frames):',
            ...item.lines.map((l) => renderLine(l, '      ')),
          ].join('\n'),
    )
    .join('\n');
}
