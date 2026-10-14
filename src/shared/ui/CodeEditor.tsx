import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { markMatches } from '../lib/find';
import './code-editor.css';

export interface EditorFind {
  starts: number[];
  length: number;
  current: number;
  nonce: number;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  highlight: (text: string) => string;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  ariaLabel?: string;
  find?: EditorFind;
}

function syncScroll(from: HTMLElement, to: HTMLElement | null) {
  if (!to) return;
  if (Math.abs(to.scrollTop - from.scrollTop) >= 1) to.scrollTop = from.scrollTop;
  if (Math.abs(to.scrollLeft - from.scrollLeft) >= 1) to.scrollLeft = from.scrollLeft;
}

export function CodeEditor({
  value,
  onChange,
  highlight,
  placeholder,
  onKeyDown,
  ariaLabel,
  find,
}: CodeEditorProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const html = useMemo(() => {
    if (!value) return '';
    const base = highlight(value);
    const marked = find ? markMatches(base, find.starts, find.length, find.current) : base;
    return marked + '\n';
  }, [value, highlight, find]);

  const nonce = find?.nonce;
  useEffect(() => {
    if (nonce === undefined) return;
    const pre = preRef.current;
    const area = areaRef.current;
    const mark = pre?.querySelector<HTMLElement>('mark.find-cur');
    if (!pre || !area || !mark) return;
    area.scrollTop = Math.max(0, mark.offsetTop - area.clientHeight / 2);
    pre.scrollTop = area.scrollTop;
  }, [nonce]);

  return (
    <div className="editor-stack">
      <pre
        ref={preRef}
        className="highlight-layer"
        aria-hidden="true"
        onScroll={(e) => syncScroll(e.currentTarget, areaRef.current)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={areaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => syncScroll(e.currentTarget, preRef.current)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
      />
    </div>
  );
}
