import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { JsonValue, Side } from '../../../shared/types';
import type { DiffNode } from '../model/diff';
import { formatPrimitive, typeClass } from '../../../shared/lib/format';

type Entry = [string | number, JsonValue];

function entriesOf(obj: JsonValue[] | Record<string, JsonValue>): Entry[] {
  return Array.isArray(obj) ? obj.map((v, i): Entry => [i, v]) : Object.entries(obj);
}

const DIFF_BG: Partial<Record<DiffNode['status'], string>> = {
  added: 'var(--added-bg)',
  removed: 'var(--removed-bg)',
  changed: 'var(--changed-bg)',
};

interface TreeNodeProps {
  name: string | number | null;
  value: JsonValue | undefined;
  diff: DiffNode | null;
  side: Side;
  depth: number;
}

function TreeNode({ name, value, diff, side, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  // Un nodo agregado solo existe en B y uno eliminado solo en A.
  if (diff?.status === 'added' && side !== 'right') return null;
  if (diff?.status === 'removed' && side !== 'left') return null;

  const val = diff ? (side === 'left' ? diff.a : diff.b) : value;
  const isContainer = val !== null && val !== undefined && typeof val === 'object';
  const obj = isContainer ? (val as JsonValue[] | Record<string, JsonValue>) : null;

  return (
    <div>
      <Box
        onClick={isContainer ? () => setExpanded((e) => !e) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.5,
          borderRadius: '4px',
          cursor: isContainer ? 'pointer' : 'default',
          bgcolor: diff ? DIFF_BG[diff.status] : undefined,
          '&:hover': { outline: '1px solid', outlineColor: 'divider' },
        }}
      >
        <Box component="span" sx={{ width: 18, display: 'inline-flex', color: 'text.secondary' }}>
          {isContainer &&
            (expanded ? (
              <ArrowDropDownIcon fontSize="small" />
            ) : (
              <ArrowRightIcon fontSize="small" />
            ))}
        </Box>
        {name !== null && (
          <Box component="span" sx={{ color: 'var(--syn-key)', fontWeight: 600 }}>
            {name}:
          </Box>
        )}
        {obj ? (
          <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {Array.isArray(obj) ? `[${obj.length}]` : `{${Object.keys(obj).length}}`}
          </Box>
        ) : (
          <span className={'tv-value ' + typeClass(val)}>{formatPrimitive(val)}</span>
        )}
      </Box>
      {obj && expanded && (
        <Box sx={{ pl: 2, ml: 1.25, borderLeft: '1px dashed', borderColor: 'divider' }}>
          {entriesOf(obj).map(([k, v]) => (
            <TreeNode
              key={k}
              name={k}
              value={v}
              diff={diff?.children?.[k] ?? null}
              side={side}
              depth={depth + 1}
            />
          ))}
        </Box>
      )}
    </div>
  );
}

interface TreeViewProps {
  value: JsonValue | undefined;
  diffRoot: DiffNode | null;
  side: Side;
}

export function TreeView({ value, diffRoot, side }: TreeViewProps) {
  if (value === undefined) {
    return <Alert severity="info">Formatea un JSON válido para ver el árbol.</Alert>;
  }
  if (value !== null && typeof value === 'object') {
    return (
      <>
        {entriesOf(value).map(([k, v]) => (
          <TreeNode
            key={k}
            name={k}
            value={v}
            diff={diffRoot?.children?.[k] ?? null}
            side={side}
            depth={0}
          />
        ))}
      </>
    );
  }
  return <TreeNode name={null} value={value} diff={diffRoot} side={side} depth={0} />;
}
