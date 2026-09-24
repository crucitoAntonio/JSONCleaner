import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import Box from '@mui/material/Box';
import { DEFAULT_SPLIT, clampSplit } from '../model/split';

export const HANDLE_PX = 12;
const KEY_STEP = 0.05;

interface SplitHandleProps {
  containerRef: RefObject<HTMLDivElement | null>;
  value: number;
  onCommit: (split: number) => void;
}

export function SplitHandle({ containerRef, value, onCommit }: SplitHandleProps) {
  const drag = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const available = () => (containerRef.current?.clientWidth ?? 0) - HANDLE_PX;

  const splitAt = (clientX: number) => {
    const box = containerRef.current;
    if (!box) return value;
    const left = box.getBoundingClientRect().left;
    return clampSplit((clientX - left - HANDLE_PX / 2) / available(), available());
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = value;
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current === null) return;
    drag.current = splitAt(e.clientX);
    containerRef.current?.style.setProperty('--split', String(drag.current));
  };

  const endDrag = () => {
    if (drag.current === null) return;
    const split = drag.current;
    drag.current = null;
    setDragging(false);
    if (split !== value) onCommit(split);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === 'ArrowLeft' ? -KEY_STEP : e.key === 'ArrowRight' ? KEY_STEP : 0;
    if (!delta) return;
    e.preventDefault();
    onCommit(clampSplit(value + delta, available()));
  };

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="Tamaño de los documentos"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      title="Arrastra para cambiar el tamaño · doble clic para igualar"
      className={dragging ? 'dragging' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onCommit(DEFAULT_SPLIT)}
      onKeyDown={onKeyDown}
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: HANDLE_PX,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'col-resize',
        touchAction: 'none',
        outline: 'none',
        '&::after': {
          content: '""',
          width: 4,
          height: 40,
          borderRadius: 2,
          bgcolor: 'divider',
          transition: 'background-color 150ms, height 150ms',
        },
        '&:hover::after, &.dragging::after, &:focus-visible::after': {
          bgcolor: 'primary.main',
          height: 72,
        },
      }}
    />
  );
}
