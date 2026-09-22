import { escapeHtml } from '../../../shared/lib/dom';

export type FrameCategory = 'tr-app' | 'tr-android' | 'tr-lang' | 'tr-lib';

export const TRACE_FRAME = /^(\s*)(at\s+)([A-Za-z_$][\w$]*(?:\.[\w$<>]+)*)\(([^()]*)\)\s*$/;
export const TRACE_MORE = /^\s*\.\.\.\s*\d+\s+more\s*$/i;
export const TRACE_CAUSED = /^\s*Caused by:\s*(.*)$/i;
export const TRACE_SUPPRESSED = /^\s*Suppressed:\s*(.*)$/i;
export const TRACE_EXCEPTION_HEAD = /[A-Za-z_$][\w$]*(?:\.[\w$]+)*(?:Exception|Error|Throwable)\b/;
export const TRACE_REPEAT_SUFFIX = /\s{2}\(×(\d+)\)$/;

export function classifyTraceClass(classPath: string, appPkg: string): FrameCategory {
  if (appPkg && classPath.indexOf(appPkg) === 0) return 'tr-app';
  if (/^(android|androidx|com\.android)\./.test(classPath)) return 'tr-android';
  if (/^(java|javax|kotlin|kotlinx)\./.test(classPath)) return 'tr-lang';
  return 'tr-lib';
}

function highlightTraceHead(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(TRACE_EXCEPTION_HEAD, (m) => '<span class="tr-header">' + m + '</span>');
}

function highlightTraceCore(line: string, appPkg: string): string {
  const frameMatch = line.match(TRACE_FRAME);
  if (frameMatch) {
    const [, indent, atKw, qualified, location] = frameMatch as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];
    const lastDot = qualified.lastIndexOf('.');
    const classPath = lastDot === -1 ? qualified : qualified.slice(0, lastDot);
    const method = lastDot === -1 ? '' : qualified.slice(lastDot + 1);
    const cls = classifyTraceClass(classPath, appPkg);
    return (
      escapeHtml(indent) +
      '<span class="tr-at">' +
      escapeHtml(atKw) +
      '</span>' +
      '<span class="' +
      cls +
      '">' +
      escapeHtml(classPath) +
      (method ? '.' + escapeHtml(method) : '') +
      '</span>' +
      '(<span class="tr-loc">' +
      escapeHtml(location) +
      '</span>)'
    );
  }
  if (TRACE_MORE.test(line)) return '<span class="tr-more">' + escapeHtml(line) + '</span>';
  const causedMatch = line.match(TRACE_CAUSED);
  if (causedMatch)
    return '<span class="tr-caused">Caused by: </span>' + highlightTraceHead(causedMatch[1]!);
  const suppressedMatch = line.match(TRACE_SUPPRESSED);
  if (suppressedMatch)
    return '<span class="tr-caused">Suppressed: </span>' + highlightTraceHead(suppressedMatch[1]!);
  if (TRACE_EXCEPTION_HEAD.test(line)) return highlightTraceHead(line);
  return escapeHtml(line);
}

function highlightTraceLine(line: string, appPkg: string): string {
  const repeatMatch = line.match(TRACE_REPEAT_SUFFIX);
  const core = repeatMatch ? line.slice(0, repeatMatch.index) : line;
  const suffix = repeatMatch ? '<span class="tr-repeat">  (×' + repeatMatch[1] + ')</span>' : '';
  return highlightTraceCore(core, appPkg) + suffix;
}

export function syntaxHighlightTrace(text: string, appPkg: string): string {
  return text
    .split('\n')
    .map((line) => highlightTraceLine(line, appPkg))
    .join('\n');
}
