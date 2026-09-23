import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { JsonValue } from '../../../shared/types';
import { formatPrimitive, typeClass } from '../../../shared/lib/format';

const tableSx = {
  mb: 1,
  '& th, & td': {
    border: '1px solid',
    borderColor: 'divider',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    py: 0.5,
    px: 1,
    verticalAlign: 'top',
  },
  '& th': { fontWeight: 600, color: 'text.secondary', bgcolor: 'action.hover' },
  '& tbody tr:hover td': { bgcolor: 'action.hover' },
} as const;

function Primitive({ value }: { value: JsonValue | undefined }) {
  return <span className={'tv-value ' + typeClass(value)}>{formatPrimitive(value)}</span>;
}

function Empty({ children }: { children: string }) {
  return (
    <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
      {children}
    </Box>
  );
}

// Los valores anidados se construyen solo al expandirlos (perezoso), como antes.
function CellValue({ value }: { value: JsonValue | undefined }) {
  const [open, setOpen] = useState(false);
  if (value === null || value === undefined || typeof value !== 'object') {
    return <Primitive value={value} />;
  }
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  return (
    <div>
      <Link
        component="button"
        underline="hover"
        onClick={() => setOpen((o) => !o)}
        sx={{ fontFamily: 'var(--mono)', fontSize: 12 }}
      >
        {(Array.isArray(value) ? 'Array' : 'Object') + '(' + count + ')'}
      </Link>
      {open && (
        <Box sx={{ mt: 0.75 }}>
          <TableNode value={value} />
        </Box>
      )}
    </div>
  );
}

function IndexCell({ i }: { i: number }) {
  return (
    <TableCell sx={{ width: '1%', whiteSpace: 'nowrap', color: 'text.secondary' }}>{i}</TableCell>
  );
}

function ObjectTable({ obj }: { obj: Record<string, JsonValue> }) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return <Empty>{'{} vacío'}</Empty>;
  return (
    <Table size="small" sx={tableSx}>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k}>
            <TableCell component="th" scope="row" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
              {k}
            </TableCell>
            <TableCell>
              <CellValue value={obj[k]} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ArrayTable({ arr }: { arr: JsonValue[] }) {
  if (arr.length === 0) return <Empty>[] vacío</Empty>;
  const allObjects = arr.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v));
  if (!allObjects) {
    return (
      <Table size="small" sx={tableSx}>
        <TableBody>
          {arr.map((v, i) => (
            <TableRow key={i}>
              <IndexCell i={i} />
              <TableCell>
                <CellValue value={v} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  // Unión de columnas en orden de aparición.
  const rows = arr as Record<string, JsonValue>[];
  const cols: string[] = [];
  rows.forEach((o) => Object.keys(o).forEach((k) => cols.includes(k) || cols.push(k)));
  return (
    <Table size="small" stickyHeader sx={tableSx}>
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          {cols.map((c) => (
            <TableCell key={c}>{c}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((o, i) => (
          <TableRow key={i}>
            <IndexCell i={i} />
            {cols.map((c) => (
              <TableCell key={c}>
                <CellValue value={o[c]} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TableNode({ value }: { value: JsonValue }) {
  if (Array.isArray(value)) return <ArrayTable arr={value} />;
  if (value !== null && typeof value === 'object') return <ObjectTable obj={value} />;
  return <Primitive value={value} />;
}

export function TableView({
  value,
  comparing,
}: {
  value: JsonValue | undefined;
  comparing: boolean;
}) {
  return (
    <>
      {comparing && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          El resaltado de diferencias no está disponible en la vista de Tabla. Usa Árbol o Texto.
        </Alert>
      )}
      {value === undefined ? (
        <Alert severity="info">Formatea un JSON válido para ver la tabla.</Alert>
      ) : (
        <TableNode value={value} />
      )}
    </>
  );
}
