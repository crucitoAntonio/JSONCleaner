import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import { track } from '../../../shared/lib/analytics';
import type { Side } from '../../../shared/types';
import { countDiffStats, diffNode } from '../model/diff';
import { diffLines } from '../model/diff-lines';
import { parsePanelText, repairJson } from '../model/panel-parse';
import type { JsonValue } from '../../../shared/types';
import type { SavedDoc } from '../model/saved-docs';
import {
  getStorageUsageBytes,
  loadSavedDocs,
  persistSavedDocs,
  upsertDoc,
} from '../model/saved-docs';
import { ConfirmDialog, NameDialog } from './dialogs';
import { DocPanel } from './DocPanel';
import type { PanelData } from './DocPanel';
import { SavedDocsSidebar } from './SavedDocsSidebar';
import './json-cleaner.css';

const initialPanel = (name: string): PanelData => ({
  text: '',
  name,
  mode: 'text',
  diffExpanded: false,
  query: '',
});

type DialogState =
  | { kind: 'save'; side: Side }
  | { kind: 'overwrite'; side: Side; name: string }
  | { kind: 'rename'; doc: SavedDoc }
  | { kind: 'delete'; doc: SavedDoc }
  | { kind: 'repair'; side: Side; value: JsonValue };

interface Toast {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

function readDocs() {
  return {
    docs: loadSavedDocs().sort((a, b) => b.savedAt - a.savedAt),
    usage: getStorageUsageBytes(),
  };
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export function JsonCleaner() {
  const [panels, setPanels] = useState<Record<Side, PanelData>>({
    left: initialPanel('Documento A'),
    right: initialPanel('Documento B'),
  });
  const [comparing, setComparing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 860);
  // Panel a pantalla completa: oculta el otro documento y la barra lateral.
  const [maximized, setMaximized] = useState<Side | null>(null);
  const [saved, setSaved] = useState(readDocs);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);

  const leftParse = useMemo(() => parsePanelText(panels.left.text), [panels.left.text]);
  const rightParse = useMemo(() => parsePanelText(panels.right.text), [panels.right.text]);
  const parses = { left: leftParse, right: rightParse };

  // Estado derivado de la comparación: se recalcula solo cuando cambia algo relevante.
  const diff = useMemo(() => {
    if (!comparing || !leftParse.valid || !rightParse.valid) return null;
    const root = diffNode(leftParse.parsed, rightParse.parsed);
    const lines = diffLines(
      JSON.stringify(leftParse.parsed, null, 2),
      JSON.stringify(rightParse.parsed, null, 2),
    );
    return {
      root,
      stats: countDiffStats(root),
      ops: lines ? { left: lines.aOps, right: lines.bOps } : null,
    };
  }, [comparing, leftParse, rightParse]);

  const update = (side: Side, patch: Partial<PanelData>) =>
    setPanels((p) => ({ ...p, [side]: { ...p[side], ...patch } }));

  const openDialog = (d: DialogState) => {
    setDialogKey((k) => k + 1);
    setDialog(d);
  };

  const format = (side: Side, text = panels[side].text) => {
    track('json_format');
    const result = parsePanelText(text);
    if (result.valid) {
      update(side, { text: JSON.stringify(result.parsed, null, 2) });
      return;
    }
    update(side, { text });
    // JSON roto: si jsonrepair puede arreglarlo, se pregunta antes de tocar el texto.
    const repaired = repairJson(text);
    if (repaired !== null) openDialog({ kind: 'repair', side, value: repaired });
  };
  const refreshDocs = () => setSaved(readDocs());

  const outputOf = (side: Side) =>
    parses[side].valid ? JSON.stringify(parses[side].parsed, null, 2) : panels[side].text;

  const requestSave = (side: Side) => {
    if (!outputOf(side).trim()) {
      setToast({
        message: 'No hay contenido para guardar en ' + panels[side].name + '.',
        severity: 'info',
      });
      return;
    }
    openDialog({ kind: 'save', side });
  };

  const commitSave = (side: Side, name: string) => {
    track('json_save');
    try {
      persistSavedDocs(upsertDoc(loadSavedDocs(), name, outputOf(side)));
    } catch {
      setToast({
        message:
          'No hay espacio suficiente para guardar. Borra algunos documentos viejos e intenta de nuevo.',
        severity: 'error',
      });
      return;
    }
    refreshDocs();
    update(side, { name });
    setToast({ message: `“${name}” guardado`, severity: 'success' });
  };

  const swap = () =>
    setPanels((p) => ({
      left: { ...p.left, text: p.right.text, name: p.right.name },
      right: { ...p.right, text: p.left.text, name: p.left.name },
    }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1 }}
      >
        <Tooltip title="Mostrar/ocultar archivos guardados">
          <IconButton
            onClick={() => setSidebarOpen((o) => !o)}
            color={sidebarOpen ? 'primary' : 'default'}
            aria-label="Mostrar u ocultar archivos guardados"
          >
            <ViewSidebarOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
          </IconButton>
        </Tooltip>
        <Typography
          variant="body2"
          noWrap
          sx={{ flex: '1 1 0', minWidth: 0, color: 'text.secondary' }}
          title="Pega logs de Logcat o JSON crudo en cada documento: formatea, explora en Árbol/Tabla y compara."
        >
          Pega logs de Logcat o JSON crudo en cada documento: formatea, explora en Árbol/Tabla y
          compara.
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>
          {comparing && (
            <>
              <LegendDot color="success.main" label="Agregado" />
              <LegendDot color="error.main" label="Eliminado" />
              <LegendDot color="warning.main" label="Cambiado" />
              <Chip
                size="small"
                color={diff ? 'primary' : 'warning'}
                variant="outlined"
                label={
                  diff
                    ? `${diff.stats.added} agregadas · ${diff.stats.removed} eliminadas · ${diff.stats.changed} cambiadas`
                    : 'Ambos documentos deben ser JSON válido'
                }
              />
            </>
          )}
          <Tooltip title="Intercambiar Documento A y B">
            <IconButton onClick={swap} aria-label="Intercambiar documentos">
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={comparing ? 'Comparando (clic para desactivar)' : 'Comparar documentos'}>
            <ToggleButton
              value="compare"
              size="small"
              color="primary"
              selected={comparing}
              onChange={() => {
                if (!comparing) track('json_compare');
                setComparing((c) => !c);
              }}
              sx={{ gap: 0.75, px: 1.5 }}
            >
              <CompareArrowsIcon fontSize="small" />
              Comparar
            </ToggleButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          px: { xs: 1.5, sm: 2 },
          pb: 2,
          overflow: { xs: 'auto', md: 'hidden' },
        }}
      >
        {sidebarOpen && !maximized && (
          <SavedDocsSidebar
            docs={saved.docs}
            usageBytes={saved.usage}
            onOpen={(doc, side) => {
              update(side, { name: doc.name });
              format(side, doc.content);
            }}
            onRename={(doc) => openDialog({ kind: 'rename', doc })}
            onDelete={(doc) => openDialog({ kind: 'delete', doc })}
          />
        )}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
          }}
        >
          {(['left', 'right'] as const)
            .filter((side) => !maximized || maximized === side)
            .map((side) => (
              <DocPanel
                key={side}
                side={side}
                data={panels[side]}
                parse={parses[side]}
                comparing={comparing}
                diffRoot={diff?.root ?? null}
                diffOps={diff ? (diff.ops ? diff.ops[side] : null) : undefined}
                onChange={(patch) => update(side, patch)}
                onFormat={(text) => format(side, text)}
                onSave={() => requestSave(side)}
                onNotify={(message) => setToast({ message, severity: 'success' })}
                maximized={maximized === side}
                onToggleMaximize={() => setMaximized((m) => (m === side ? null : side))}
              />
            ))}
        </Box>
      </Box>

      {dialog?.kind === 'save' && (
        <NameDialog
          key={dialogKey}
          open
          title="Guardar documento"
          initialName={panels[dialog.side].name}
          confirmLabel="Guardar"
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            const side = dialog.side;
            if (loadSavedDocs().some((d) => d.name === name)) {
              openDialog({ kind: 'overwrite', side, name });
            } else {
              setDialog(null);
              commitSave(side, name);
            }
          }}
        />
      )}
      {dialog?.kind === 'overwrite' && (
        <ConfirmDialog
          open
          title="¿Sobrescribir?"
          message={`Ya existe un documento guardado con el nombre “${dialog.name}”. ¿Sobrescribir?`}
          confirmLabel="Sobrescribir"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            commitSave(dialog.side, dialog.name);
          }}
        />
      )}
      {dialog?.kind === 'rename' && (
        <NameDialog
          key={dialogKey}
          open
          title="Renombrar documento"
          initialName={dialog.doc.name}
          confirmLabel="Renombrar"
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            const list = loadSavedDocs();
            const doc = list.find((d) => d.id === dialog.doc.id);
            if (doc) {
              doc.name = name;
              persistSavedDocs(list);
              refreshDocs();
            }
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'repair' && (
        <ConfirmDialog
          open
          title="¿Intentar reparar el JSON?"
          message={`${panels[dialog.side].name} no es JSON válido, pero parece reparable (comas sobrantes, comillas simples, claves sin comillas, comentarios o JSON cortado). Revisa el resultado después de repararlo.`}
          confirmLabel="Reparar"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            update(dialog.side, { text: JSON.stringify(dialog.value, null, 2) });
            setDialog(null);
            setToast({ message: 'JSON reparado y formateado', severity: 'success' });
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title="¿Eliminar documento?"
          message={`Se eliminará “${dialog.doc.name}”. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            persistSavedDocs(loadSavedDocs().filter((d) => d.id !== dialog.doc.id));
            refreshDocs();
            setDialog(null);
          }}
        />
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={toast?.severity === 'error' ? 6000 : 2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
