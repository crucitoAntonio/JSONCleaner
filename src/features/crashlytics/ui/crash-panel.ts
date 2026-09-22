import { normalizeTraceText } from '../model/formatter';
import { syntaxHighlightTrace } from '../model/tokenizer';

const CRASH_PKG_KEY = 'jsonCleaner.crashPkg';

export function initCrashPanel(): void {
  const crashEditor = document.querySelector<HTMLTextAreaElement>('.crash-editor');
  const crashHighlight = document.querySelector<HTMLElement>('.crash-highlight');
  const crashPkgInput = document.getElementById('crashPkgInput') as HTMLInputElement | null;
  if (!crashEditor || !crashHighlight || !crashPkgInput) return;

  function updateCrashHighlight(): void {
    const text = crashEditor!.value;
    const pkg = (crashPkgInput!.value || '').trim();
    crashHighlight!.innerHTML = text ? syntaxHighlightTrace(text, pkg) + '\n' : '';
  }

  crashPkgInput.value = localStorage.getItem(CRASH_PKG_KEY) || '';

  crashEditor.addEventListener('input', updateCrashHighlight);
  crashEditor.addEventListener('scroll', () => {
    crashHighlight.scrollTop = crashEditor.scrollTop;
    crashHighlight.scrollLeft = crashEditor.scrollLeft;
  });
  crashPkgInput.addEventListener('input', () => {
    localStorage.setItem(CRASH_PKG_KEY, crashPkgInput.value);
    updateCrashHighlight();
  });

  document.querySelectorAll<HTMLButtonElement>('button[data-crash-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.crashAction;
      if (action === 'format') {
        crashEditor.value = normalizeTraceText(crashEditor.value);
        updateCrashHighlight();
      } else if (action === 'copy') {
        if (crashEditor.value) void navigator.clipboard.writeText(crashEditor.value);
      } else if (action === 'download') {
        if (!crashEditor.value) return;
        const blob = new Blob([crashEditor.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crash_trace_' + Date.now() + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (action === 'clear') {
        crashEditor.value = '';
        updateCrashHighlight();
      }
    });
  });

  updateCrashHighlight();
}
