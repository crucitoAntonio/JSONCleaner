import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SaveIcon from '@mui/icons-material/Save';
import NotesIcon from '@mui/icons-material/Notes';
import SearchIcon from '@mui/icons-material/Search';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
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
  maximized: boolean;
  onToggleMaximize: () => void;
}

const MODES: { value: PanelMode; label: string; icon: ReactElement }[] = [
  { value: 'text', label: 'Texto', icon: <NotesIcon sx={{ fontSize: 18 }} /> },
  { value: 'tree', label: 'Árbol', icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: 'table', label: 'Tabla', icon: <TableChartOutlinedIcon sx={{ fontSize: 18 }} /> },
];

// Con el panel angosto (barra lateral abierta, laptop) los modos se muestran solo como
// íconos, así la barra del panel no se parte en dos filas.
const NARROW = '@container (max-width: 470px)';

const STATUS_DOT = { ok: 'success.main', err: 'error.main', idle: 'transparent' } as const;

// Fuera del componente: react-hooks/purity no permite Date.now() en el scope del render.
function downloadJson(text: string, name: string): void {
  downloadText(text, slugify(name) + '_' + Date.now() + '.json', 'application/json');
}

type MenuAction = 'save' | 'load' | 'download' | 'clear';

// Acciones poco frecuentes: van al menú ⋮ para que la barra quepa en una fila.
const MENU_ACTIONS: { action: MenuAction; label: string; icon: ReactElement }[] = [
  { action: 'save', label: 'Guardar', icon: <SaveIcon fontSize="small" /> },
  { action: 'load', label: 'Cargar archivo', icon: <UploadFileIcon fontSize="small" /> },
  { action: 'download', label: 'Descargar', icon: <DownloadIcon fontSize="small" /> },
  { action: 'clear', label: 'Limpiar', icon: <ClearAllIcon fontSize="small" /> },
];

function Action(props: {
  title: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  icon: ReactElement;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip title={props.title}>
      <IconButton
        size="small"
        onClick={props.onClick}
        aria-label={props.title}
        color={props.active ? 'primary' : 'default'}
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
  maximized,
  onToggleMaximize,
}: DocPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const queryInput = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const letter = side === 'left' ? 'A' : 'B';
  const output = () => (parse.valid ? JSON.stringify(parse.parsed, null, 2) : data.text);
  // La fila de consulta solo ocupa espacio mientras se usa.
  const showSearch = searchOpen || data.query !== '';

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

  const openSearch = () => {
    setSearchOpen(true);
    // Si la fila ya estaba visible, autoFocus no vuelve a correr.
    queryInput.current?.focus();
  };
  const closeSearch = () => {
    onChange({ query: '' });
    setSearchOpen(false);
  };

  const loadFile = (file: File) => {
    const reader = new FileReader();
    // Se formatea al cargar, igual que antes.
    reader.onload = () => onFormat(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const runMenuAction = (action: MenuAction) => {
    setMenuAnchor(null);
    if (action === 'save') onSave();
    else if (action === 'load') fileInput.current?.click();
    else if (action === 'clear') onChange({ text: '' });
    else {
      const text = output();
      if (text) downloadJson(text, data.name);
    }
  };

  return (
    <Card
      onKeyDown={(e) => {
        // ⌘/Ctrl+F dentro del panel abre su consulta; fuera sigue siendo la búsqueda del navegador.
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          openSearch();
        } else if (e.key === 'Escape' && maximized) {
          onToggleMaximize();
        }
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 360, md: 0 },
        containerType: 'inline-size',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 1,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          bgcolor: 'action.hover',
        }}
      >
        <Tooltip title={parse.error ? parse.status.text + ': ' + parse.error : parse.status.text}>
          <Box
            role="img"
            aria-label={parse.status.text}
            sx={{
              width: 10,
              height: 10,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: STATUS_DOT[parse.status.kind],
              border: parse.status.kind === 'idle' ? '1.5px solid' : 0,
              borderColor: 'text.disabled',
            }}
          />
        </Tooltip>
        <InputBase
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          inputProps={{ 'aria-label': 'Nombre del documento ' + letter, spellCheck: false }}
          sx={{
            flex: '1 1 80px',
            minWidth: 60,
            maxWidth: 220,
            fontWeight: 600,
            fontSize: 14,
            px: 0.75,
            borderRadius: 1,
            '&:hover, &.Mui-focused': { bgcolor: 'background.paper' },
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={data.mode}
          onChange={(_, mode: PanelMode | null) => mode && onChange({ mode })}
          sx={{
            flexShrink: 0,
            '& .MuiToggleButton-root': { px: 1.25, py: 0.25 },
            '& .mode-icon': { display: 'none' },
            [NARROW]: {
              '& .MuiToggleButton-root': { px: 0.75, py: 0.5 },
              '& .mode-icon': { display: 'flex' },
              '& .mode-label': { display: 'none' },
            },
          }}
        >
          {MODES.map((m) => (
            <ToggleButton key={m.value} value={m.value} aria-label={m.label} title={m.label}>
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
          <Action
            primary
            title="Formatear (⌘/Ctrl + Enter)"
            onClick={() => onFormat()}
            icon={<AutoAwesomeIcon fontSize="small" />}
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
            title="Consultar (⌘/Ctrl + F)"
            active={showSearch}
            onClick={() => (showSearch ? closeSearch() : openSearch())}
            icon={<SearchIcon fontSize="small" />}
          />
          <Action
            title={maximized ? 'Restaurar (Esc)' : 'Maximizar'}
            onClick={onToggleMaximize}
            icon={
              maximized ? (
                <CloseFullscreenIcon fontSize="small" />
              ) : (
                <OpenInFullIcon fontSize="small" />
              )
            }
          />
          <Action
            title="Más acciones"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            icon={<MoreVertIcon fontSize="small" />}
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
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {MENU_ACTIONS.map((a) => (
            <MenuItem key={a.action} dense onClick={() => runMenuAction(a.action)}>
              <ListItemIcon>{a.icon}</ListItemIcon>
              <ListItemText>{a.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Stack>
      <Divider />
      {showSearch && (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, pt: 1 }}>
          <InputBase
            inputRef={queryInput}
            autoFocus
            value={data.query}
            onChange={(e) => onChange({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              // Esc limpia la consulta; con el campo vacío, cierra la fila.
              e.stopPropagation();
              if (data.query) onChange({ query: '' });
              else setSearchOpen(false);
            }}
            placeholder={
              parse.valid
                ? 'Consulta, p. ej. $.players[?(@.level > 10)].name'
                : 'Pega un JSON válido para consultarlo'
            }
            startAdornment={
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
            }
            endAdornment={
              <IconButton
                size="small"
                aria-label="Cerrar consulta"
                onClick={closeSearch}
                sx={{ p: 0.25 }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
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
      )}

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
