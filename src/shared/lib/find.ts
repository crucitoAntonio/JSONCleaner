export const MAX_MATCHES = 5000;

export function findMatches(text: string, query: string): number[] {
  if (!query.trim()) return [];
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  if (hay.length !== text.length) return [];
  const starts: number[] = [];
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1 || starts.length >= MAX_MATCHES) return starts;
    starts.push(at);
    from = at + needle.length;
  }
}

const ENTITY = /^&(?:#\w+|\w+);/;

export function markMatches(
  html: string,
  starts: number[],
  length: number,
  current: number,
): string {
  if (starts.length === 0 || length === 0) return html;
  let out = '';
  let pos = 0;
  let next = 0;
  let active = -1;
  let open = false;
  let i = 0;
  while (i < html.length) {
    const ch = html.charAt(i);
    if (ch === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      if (open) {
        out += '</mark>';
        open = false;
      }
      out += html.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    const entity = ch === '&' ? ENTITY.exec(html.slice(i, i + 12)) : null;
    const unit = entity ? entity[0] : ch;
    if (active >= 0 && pos === (starts[active] ?? 0) + length) {
      if (open) out += '</mark>';
      open = false;
      active = -1;
    }
    if (active < 0 && next < starts.length && starts[next] === pos) {
      active = next;
      next += 1;
    }
    if (active >= 0 && !open) {
      out += '<mark class="find' + (active === current ? ' find-cur' : '') + '">';
      open = true;
    }
    out += unit;
    pos += 1;
    i += unit.length;
  }
  if (open) out += '</mark>';
  return out + html.slice(i);
}
