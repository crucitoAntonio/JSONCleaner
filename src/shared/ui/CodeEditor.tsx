import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { findFoldRegions, foldView, toReal } from '../lib/fold';
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
  foldable?: boolean;
}

const NO_FOLDS: ReadonlySet<number> = new Set();
const MAX_MARKS = 3000;
const EDIT_KEYS = new Set(['Backspace', 'Delete', 'Enter', 'Tab']);

interface FoldMark {
  open: number;
  top: number;
}

function syncScroll(from: HTMLElement, to: HTMLElement | null, track?: HTMLElement | null) {
  if (track) track.style.transform = `translateY(${-from.scrollTop}px)`;
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
  foldable,
}: CodeEditorProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [fold, setFold] = useState<{ value: string; set: ReadonlySet<number> }>({
    value: '',
    set: NO_FOLDS,
  });
  const [marks, setMarks] = useState<FoldMark[]>([]);
  const [tick, setTick] = useState(0);
  const folded = fold.value === value ? fold.set : NO_FOLDS;

  const regions = useMemo(
    () => (foldable && !find ? findFoldRegions(value) : []),
    [foldable, find, value],
  );
  const view = useMemo(
    () => (regions.length > 0 ? foldView(value, regions, folded) : null),
    [regions, value, folded],
  );
  const shown = view ? view.text : value;
  const collapsed = view !== null && view.spans.length > 0;

  const html = useMemo(() => {
    if (!shown) return '';
    const base = highlight(shown);
    const marked = find ? markMatches(base, find.starts, find.length, find.current) : base;
    return marked + '\n';
  }, [shown, highlight, find]);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const observer = new ResizeObserver(() => setTick((t) => t + 1));
    observer.observe(pre);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre || !view) {
      setMarks((m) => (m.length > 0 ? [] : m));
      return;
    }
    const nodes: { node: Text; start: number }[] = [];
    let total = 0;
    const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      nodes.push({ node: n as Text, start: total });
      total += n.nodeValue?.length ?? 0;
    }
    const preTop = pre.getBoundingClientRect().top;
    const range = document.createRange();
    const seen = new Set<number>();
    const next: FoldMark[] = [];
    for (const v of view.visible) {
      if (next.length >= MAX_MARKS) break;
      const lineStart = view.text.lastIndexOf('\n', v.disp - 1) + 1;
      if (seen.has(lineStart)) continue;
      seen.add(lineStart);
      let lo = 0;
      let hi = nodes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((nodes[mid]?.start ?? 0) <= lineStart) lo = mid;
        else hi = mid - 1;
      }
      const entry = nodes[lo];
      if (!entry) continue;
      const off = lineStart - entry.start;
      range.setStart(entry.node, off);
      range.setEnd(entry.node, Math.min(off + 1, entry.node.length));
      const rect = range.getClientRects()[0];
      if (rect) next.push({ open: v.open, top: rect.top - preTop + pre.scrollTop });
    }
    setMarks(next);
  }, [view, html, tick]);

  const toggle = (open: number) => {
    const set = new Set(folded);
    if (set.has(open)) set.delete(open);
    else set.add(open);
    setFold({ value, set });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      collapsed &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      (e.key.length === 1 || EDIT_KEYS.has(e.key))
    ) {
      setFold({ value, set: NO_FOLDS });
    }
    onKeyDown?.(e);
  };

  const handleCopy = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!view || !collapsed) return;
    const { selectionStart, selectionEnd } = e.currentTarget;
    if (selectionStart === selectionEnd) return;
    e.preventDefault();
    e.clipboardData.setData(
      'text/plain',
      value.slice(toReal(view.spans, selectionStart), toReal(view.spans, selectionEnd)),
    );
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!view || !collapsed) return;
    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const pasted = e.clipboardData.getData('text/plain');
    onChange(
      value.slice(0, toReal(view.spans, selectionStart)) +
        pasted +
        value.slice(toReal(view.spans, selectionEnd)),
    );
  };

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
        onScroll={(e) => syncScroll(e.currentTarget, areaRef.current, trackRef.current)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {marks.length > 0 && (
        <div className="fold-gutter">
          <div
            className="fold-track"
            ref={(el) => {
              trackRef.current = el;
              if (el && areaRef.current)
                el.style.transform = `translateY(${-areaRef.current.scrollTop}px)`;
            }}
          >
            {marks.map((m) => (
              <button
                key={m.open}
                type="button"
                tabIndex={-1}
                className={'fold-btn' + (folded.has(m.open) ? ' folded' : '')}
                style={{ top: m.top }}
                aria-label={folded.has(m.open) ? 'Expandir' : 'Contraer'}
                onClick={() => toggle(m.open)}
              />
            ))}
          </div>
        </div>
      )}
      <textarea
        ref={areaRef}
        value={shown}
        readOnly={collapsed}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onScroll={(e) => syncScroll(e.currentTarget, preRef.current, trackRef.current)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
      />
    </div>
  );
}
