import { useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import './code-editor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Devuelve HTML ya escapado (syntaxHighlightText / syntaxHighlightTrace). */
  highlight: (text: string) => string;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  ariaLabel?: string;
}

export function CodeEditor({
  value,
  onChange,
  highlight,
  placeholder,
  onKeyDown,
  ariaLabel,
}: CodeEditorProps) {
  const preRef = useRef<HTMLPreElement>(null);
  // El '\n' final evita que la última línea vacía del textarea quede sin altura en el <pre>.
  const html = useMemo(() => (value ? highlight(value) + '\n' : ''), [value, highlight]);

  return (
    <div className="editor-stack">
      <pre
        ref={preRef}
        className="highlight-layer"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (!preRef.current) return;
          preRef.current.scrollTop = e.currentTarget.scrollTop;
          preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
      />
    </div>
  );
}
