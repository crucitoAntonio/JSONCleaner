export interface FoldRegion {
  open: number;
  close: number;
}

export interface FoldSpan {
  disp: number;
  realStart: number;
  realEnd: number;
}

export interface FoldView {
  text: string;
  spans: FoldSpan[];
  visible: { open: number; disp: number }[];
}

export const FOLD_PLACEHOLDER = '…';
const MAX_FOLD_CHARS = 3_000_000;
const MIN_FOLD_STRING = 200;

export function findFoldRegions(text: string): FoldRegion[] {
  if (text.length > MAX_FOLD_CHARS) return [];
  const regions: FoldRegion[] = [];
  const stack: { ch: string; at: number; line: number }[] = [];
  let inString = false;
  let stringStart = 0;
  let line = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    if (c === '\n') {
      line++;
      inString = false;
      continue;
    }
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') {
        inString = false;
        if (i - stringStart >= MIN_FOLD_STRING) regions.push({ open: stringStart, close: i });
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      stringStart = i;
    } else if (c === '{' || c === '[') stack.push({ ch: c, at: i, line });
    else if (c === '}' || c === ']') {
      const top = stack[stack.length - 1];
      if (!top || (top.ch === '{') !== (c === '}')) continue;
      stack.pop();
      if (top.line !== line) regions.push({ open: top.at, close: i });
    }
  }
  return regions.sort((a, b) => a.open - b.open);
}

export function foldView(
  text: string,
  regions: FoldRegion[],
  folded: ReadonlySet<number>,
): FoldView {
  let out = '';
  let last = 0;
  let removed = 0;
  let skipUntil = -1;
  const spans: FoldSpan[] = [];
  const visible: { open: number; disp: number }[] = [];
  for (const r of regions) {
    if (r.open < skipUntil) continue;
    visible.push({ open: r.open, disp: r.open - removed });
    if (!folded.has(r.open)) continue;
    out += text.slice(last, r.open + 1) + FOLD_PLACEHOLDER;
    spans.push({ disp: out.length - 1, realStart: r.open + 1, realEnd: r.close });
    removed += r.close - r.open - 2;
    last = r.close;
    skipUntil = r.close;
  }
  return { text: out + text.slice(last), spans, visible };
}

export function toReal(spans: FoldSpan[], pos: number): number {
  let delta = 0;
  for (const s of spans) {
    if (pos <= s.disp) break;
    delta += s.realEnd - s.realStart - 1;
  }
  return pos + delta;
}
