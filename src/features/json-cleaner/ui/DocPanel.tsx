import { useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { Side } from '../../../shared/types';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { downloadText } from '../../../shared/lib/download';
import { slugify } from '../../../shared/lib/format';
import type { DiffNode } from '../model/diff';
import type { LineOp } from '../model/diff-lines';
import { syntaxHighlightText } from '../model/highlight';
import type { PanelParse } from '../model/panel-parse';
import { runQuery } from '../model/query';
import { DiffPreview } from './DiffPreview';
import { TableView } from './TableView';
import { TreeView } from './TreeView';

export type PanelMode = 'text' | 'tree' | 'table';

export interface PanelData {
  text: string;
  name: string;
  mode: PanelMode;
  diffExpanded: boolean;
  /** Consulta JSONPath; si no está vacía, el panel muestra sus resultados en vez del documento. */
  query: string;
}

interface DocPanelProps {
  side: Side;
  data: PanelData;
  parse: PanelParse;
  comparing: boolean;
  diffRoot: DiffNode | null;
  /** undefined = no se muestra el bloque de diff; null = diff abortado por tamaño. */
  diffOps: LineOp[] | null | undefined;
  onChange: (patch: Partial<PanelData>) => void;
  /** Formatea el texto actual, o `text` si se pasa (p. ej. al cargar un archivo). */
  onFormat: (text?: string) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
}

const STATUS_COLOR = { ok: 'success', err: 'error', idle: 'default' } as const;

function Action(props: {
  title: string;
  onClick: () => void;
  icon: ReactElement;
  primary?: boolean;
}) {
  return (
    <Tooltip title={props.title}>
      <IconButton
        size="small"
        onClick={props.onClick}
        aria-label={props.title}
        sx={
          props.primary
            ? {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mr: 0.5,
                '&:hover': { bgcolor: 'primary.dark' },
              }
            : undefined
        }
      >
        {props.icon}
      </IconButton>
    </Tooltip>
  );
}

export function DocPanel({
  side,
  data,
  parse,
  comparing,
  diffRoot,
  diffOps,
  onChange,
  onFormat,
  onSave,
  onNotify,
}: DocPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const letter = side === 'left' ? 'A' : 'B';
  const output = () => (parse.valid ? JSON.stringify(parse.parsed, null, 2) : data.text);

  const querying = data.query.trim() !== '' && parse.valid;
  const query = useMemo(
    () => (querying ? runQuery(parse.parsed!, data.query) : null),
    [querying, parse.parsed, data.query],
  );
  // Cada resultado queda bajo su ruta, así el árbol muestra de dónde salió cada valor.
  const queryTree = useMemo(
    () => (query?.ok ? Object.fromEntries(query.matches.map((m) => [m.path, m.value])) : null),
    [query],
  );

  const loadFile = (file: File) => {
    const reader = new FileReader();
    // Se formatea al cargar, igual que antes.
    reader.onload = () => onFormat(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <Card
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 360, md: 0 },
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 1,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: 'action.hover',
        }}
      >
        <InputBase
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          inputProps={{ 'aria-label': 'Nombre del documento ' + letter, spellCheck: false }}
          sx={{
            flex: '1 1 110px',
            maxWidth: 220,
            fontWeight: 600,
            fontSize: 14,
            px: 1,
            borderRadius: 1,
            '&:hover, &.Mui-focused': { bgcolor: 'background.paper' },
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={data.mode}
          onChange={(_, mode: PanelMode | null) => mode && onChange({ mode })}
          sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.25 } }}
        >
          <ToggleButton value="text">Texto</ToggleButton>
          <ToggleButton value="tree">Árbol</ToggleButton>
          <ToggleButton value="table">Tabla</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, ml: 'auto' }}>
          <Action
            primary
            title="Formatear (⌘/Ctrl + Enter)"
            onClick={() => onFormat()}
            icon={<AutoAwesomeIcon fontSize="small" />}
          />
          <Action title="Guardar" onClick={onSave} icon={<SaveIcon fontSize="small" />} />
          <Action
            title="Cargar archivo"
            onClick={() => fileInput.current?.click()}
            icon={<UploadFileIcon fontSize="small" />}
          />
          <Action
            title="Copiar"
            onClick={() => {
              const text = output();
              if (!text) return;
              void navigator.clipboard
                .writeText(text)
                .then(() => onNotify('Copiado al portapapeles'));
            }}
            icon={<ContentCopyIcon fontSize="small" />}
          />
          <Action
            title="Descargar"
            onClick={() => {
              const text = output();
              if (text)
                downloadText(
                  text,
                  slugify(data.name) + '_' + Date.now() + '.json',
                  'application/json',
                );
            }}
            icon={<DownloadIcon fontSize="small" />}
          />
          <Action
            title="Limpiar"
            onClick={() => onChange({ text: '' })}
            icon={<ClearAllIcon fontSize="small" />}
          />
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".json,.log,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
              e.target.value = '';
            }}
          />
        </Stack>
      </Stack>
      <Divider />
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 2, pt: 1 }}>
        <Tooltip title={parse.error ?? ''} disableHoverListener={!parse.error}>
          <Chip
            size="small"
            variant={parse.status.kind === 'idle' ? 'outlined' : 'filled'}
            color={STATUS_COLOR[parse.status.kind]}
            label={parse.status.text}
          />
        </Tooltip>
        <InputBase
          value={data.query}
          onChange={(e) => onChange({ query: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && onChange({ query: '' })}
          placeholder="Consulta, p. ej. $.players[?(@.level > 10)].name"
          disabled={!parse.valid && !data.query}
          startAdornment={<SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />}
          endAdornment={
            data.query && (
              <IconButton
                size="small"
                aria-label="Quitar consulta"
                onClick={() => onChange({ query: '' })}
                sx={{ p: 0.25 }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )
          }
          inputProps={{
            'aria-label': 'Consulta JSONPath del documento ' + letter,
            spellCheck: false,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            px: 1,
            fontFamily: 'var(--mono)',
            fontSize: 12.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            '&.Mui-focused': { borderColor: 'primary.main' },
          }}
        />
        {query?.ok && (
          <>
            <Chip
              size="small"
              variant="outlined"
              label={
                query.matches.length === 1 ? '1 resultado' : query.matches.length + ' resultados'
              }
            />
            <Action
              title="Copiar resultados"
              onClick={() =>
                void navigator.clipboard
                  .writeText(
                    JSON.stringify(
                      query.matches.map((m) => m.value),
                      null,
                      2,
                    ),
                  )
                  .then(() => onNotify('Resultados copiados al portapapeles'))
              }
              icon={<ContentCopyIcon fontSize="small" />}
            />
          </>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {query ? (
          query.ok ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                p: 1.5,
                fontFamily: 'var(--mono)',
                fontSize: 12.5,
                lineHeight: 1.6,
              }}
            >
              {query.matches.length > 0 ? (
                <TreeView value={queryTree!} diffRoot={null} side={side} />
              ) : (
                <Box sx={{ color: 'text.secondary', fontFamily: 'inherit' }}>
                  Sin resultados para esta consulta.
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="warning" sx={{ m: 2 }}>
              Consulta inválida: {query.error}
            </Alert>
          )
        ) : data.mode === 'text' ? (
          <>
            <CodeEditor
              value={data.text}
              onChange={(text) => onChange({ text })}
              highlight={syntaxHighlightText}
              placeholder={`Pega aquí el log o JSON del Documento ${letter}...`}
              ariaLabel={'Contenido del documento ' + letter}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  onFormat();
                }
              }}
            />
            {diffOps !== undefined && (
              <DiffPreview
                ops={diffOps}
                expanded={data.diffExpanded}
                onToggle={() => onChange({ diffExpanded: !data.diffExpanded })}
              />
            )}
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              p: 1.5,
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            {data.mode === 'tree' ? (
              <TreeView value={parse.parsed} diffRoot={comparing ? diffRoot : null} side={side} />
            ) : (
              <TableView value={parse.parsed} comparing={comparing} />
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}
