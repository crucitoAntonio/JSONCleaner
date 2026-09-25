const ANDROID_STUDIO =
  /^\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+-\d+\s+\S+\s+\S+\s+[VDIWEFS]\s{2,}/;
const THREADTIME = /^\s*\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+[VDIWEFS]\s+\S+:\s*/;
const BRIEF = /^\s*[VDIWEFS]\/[^\s:(][^:(]*(?:\(\s*\d+\))?:\s?/;
const SEPARATOR = /^-{9} beginning of \S+$/;

export function stripLogPrefix(line: string): string {
  for (const prefix of [ANDROID_STUDIO, THREADTIME, BRIEF]) {
    if (prefix.test(line)) return line.replace(prefix, '');
  }
  return line;
}

export function isLogSeparator(line: string): boolean {
  return SEPARATOR.test(line.trim());
}
