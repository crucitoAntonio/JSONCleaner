import { useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { escapeHtml } from '../../../shared/lib/dom';
import { formatBytes } from '../../../shared/lib/format';
import { downloadBytes } from '../../../shared/lib/download';
import { track } from '../../../shared/lib/analytics';
import { bytesToBase64, detectFileType, encodeFile, fileTooLarge, runCodec } from '../model/encode';
import type { Direction, EncodeMode, FileInfo } from '../model/encode';
import './encode.css';

const MODES: { value: EncodeMode; label: string; hint: string }[] = [
  { value: 'base64', label: 'Base64', hint: 'Base64 estándar (+ / y relleno =)' },
  {
    value: 'base64url',
    label: 'Base64URL',
    hint: 'Variante segura para URLs y JWT (- _ sin relleno)',
  },
  { value: 'url', label: 'URL', hint: 'Codificación de porcentaje (encodeURIComponent)' },
];

const DISPLAY_MAX = 200_000;

interface LoadedFile {
  name: string;
  mime: string;
  bytes: Uint8Array<ArrayBuffer>;
}

function PanelHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', minHeight: 46 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack direction="row" sx={{ ml: 'auto', gap: 0.25, alignItems: 'center' }}>
        {children}
      </Stack>
    </Stack>
  );
}

function FilePreview({
  bytes,
  mime,
  image,
  title,
  subtitle,
  action,
}: {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  image: boolean;
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  const src = useMemo(
    () => (image ? `data:${mime};base64,${bytesToBase64(bytes)}` : null),
    [bytes, mime, image],
  );
  return (
    <Stack sx={{ flex: 1, minHeight: 0, p: 2, gap: 1.5, overflow: 'auto' }}>
      {src ? (
        <Box className="encode-preview">
          <img src={src} alt={title} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3, color: 'text.secondary' }}>
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 56 }} />
        </Box>
      )}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>
        {action}
      </Stack>
    </Stack>
  );
}

function describe(info: FileInfo, size: number): string {
  return `${info.label} · ${info.mime} · ${formatBytes(size)}`;
}

export function Encoder() {
  const [mode, setMode] = useState<EncodeMode>('base64');
  const [direction, setDirection] = useState<Direction>('encode');
  const [plusAsSpace, setPlusAsSpace] = useState(false);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [asDataUri, setAsDataUri] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const acceptsFiles = mode !== 'url';

  const fileText = useMemo(
    () =>
      file
        ? encodeFile(file.bytes, file.mime, { urlSafe: mode === 'base64url', dataUri: asDataUri })
        : null,
    [file, mode, asDataUri],
  );
  const result = useMemo(
    () => (file ? null : runCodec(mode, direction, input, { plusAsSpace })),
    [file, mode, direction, input, plusAsSpace],
  );
  const decodedFile = result?.ok && result.content.kind === 'file' ? result.content : null;
  const outputText =
    fileText ?? (result?.ok && result.content.kind === 'text' ? result.content.text : '');
  const verb = direction === 'encode' ? 'codificar' : 'decodificar';

  const changeMode = (m: EncodeMode) => {
    setMode(m);
    if (m === 'url') setFile(null);
  };

  const changeDirection = (d: Direction) => {
    setDirection(d);
    if (d === 'decode') setFile(null);
  };

  const loadFile = async (f: File) => {
    const tooBig = fileTooLarge(f.size);
    if (tooBig) {
      setFileError(tooBig);
      return;
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    setFile({
      name: f.name || 'archivo',
      mime: f.type || detectFileType(bytes)?.mime || 'application/octet-stream',
      bytes,
    });
    setFileError(null);
    setDirection('encode');
    track('encode_file', { kind: f.type.startsWith('image/') ? 'image' : 'other' });
  };

  const clearInput = () => {
    setInput('');
    setFile(null);
    setFileError(null);
  };

  const swap = () => {
    if (!outputText || file) return;
    setInput(outputText);
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
  };

  const copy = () => {
    if (!outputText) return;
    track('encode_run', { mode, dir: direction });
    void navigator.clipboard.writeText(outputText).then(() => setCopied(true));
  };

  const downloadDecoded = () => {
    if (!decodedFile) return;
    downloadBytes(decodedFile.bytes, `decodificado.${decodedFile.info.ext}`, decodedFile.info.mime);
    track('decode_file_download', { kind: decodedFile.info.image ? 'image' : 'other' });
  };

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!acceptsFiles || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (!acceptsFiles) return;
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void loadFile(f);
  };

  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    if (!acceptsFiles) return;
    const f = e.clipboardData.files[0];
    if (!f) return;
    e.preventDefault();
    void loadFile(f);
  };

  const cardSx = {
    flex: 1,
    minWidth: 0,
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 1,
  } as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1 }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, m: EncodeMode | null) => m && changeMode(m)}
          aria-label="Formato"
        >
          {MODES.map((m) => (
            <Tooltip key={m.value} title={m.hint}>
              <ToggleButton value={m.value} sx={{ textTransform: 'none', px: 1.5 }}>
                {m.label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={direction}
          onChange={(_, d: Direction | null) => d && changeDirection(d)}
          aria-label="Dirección"
        >
          <ToggleButton value="encode" sx={{ textTransform: 'none', px: 1.5 }}>
            Codificar
          </ToggleButton>
          <ToggleButton value="decode" sx={{ textTransform: 'none', px: 1.5 }}>
            Decodificar
          </ToggleButton>
        </ToggleButtonGroup>
        {mode === 'url' && direction === 'decode' && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={plusAsSpace}
                onChange={(e) => setPlusAsSpace(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Tratar + como espacio (formularios)</Typography>}
          />
        )}
        {file && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={asDataUri}
                onChange={(e) => setAsDataUri(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                Como data URI (<code>data:{file.mime};base64,…</code>)
              </Typography>
            }
          />
        )}
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          pb: 2,
        }}
      >
        <Card
          sx={{
            ...cardSx,
            outline: dragging ? '2px dashed' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPaste={onPaste}
        >
          <PanelHeader title="Entrada">
            {acceptsFiles && (
              <Tooltip title="Cargar un archivo o imagen para convertirlo a Base64">
                <IconButton
                  size="small"
                  onClick={() => fileInput.current?.click()}
                  aria-label="Cargar archivo"
                >
                  <UploadFileIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Limpiar">
              <IconButton size="small" onClick={clearInput} aria-label="Limpiar">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              ref={fileInput}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = '';
              }}
            />
          </PanelHeader>
          <Divider />
          {fileError && (
            <Alert severity="error" onClose={() => setFileError(null)} sx={{ m: 1.5, mb: 0 }}>
              {fileError}
            </Alert>
          )}
          {file ? (
            <FilePreview
              bytes={file.bytes}
              mime={file.mime}
              image={file.mime.startsWith('image/')}
              title={file.name}
              subtitle={`${file.mime} · ${formatBytes(file.bytes.length)}`}
              action={
                <Button size="small" startIcon={<CloseIcon />} onClick={() => setFile(null)}>
                  Quitar
                </Button>
              }
            />
          ) : (
            <CodeEditor
              value={input}
              onChange={setInput}
              highlight={escapeHtml}
              placeholder={
                acceptsFiles && direction === 'encode'
                  ? 'Escribe o pega texto a codificar… o arrastra, pega o carga una imagen o archivo'
                  : `Escribe o pega el texto a ${verb}…`
              }
              ariaLabel="Texto de entrada"
            />
          )}
        </Card>

        <Card sx={cardSx}>
          <PanelHeader title="Resultado">
            {outputText && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                {outputText.length.toLocaleString('es')} caracteres
              </Typography>
            )}
            {!file && !decodedFile && (
              <Tooltip title="Usar el resultado como entrada e invertir la dirección">
                <span>
                  <IconButton
                    size="small"
                    onClick={swap}
                    disabled={!outputText}
                    aria-label="Intercambiar"
                  >
                    <SwapHorizIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {decodedFile ? (
              <Tooltip title="Descargar archivo">
                <IconButton size="small" onClick={downloadDecoded} aria-label="Descargar archivo">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Copiar">
                <span>
                  <IconButton
                    size="small"
                    onClick={copy}
                    disabled={!outputText}
                    aria-label="Copiar"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </PanelHeader>
          <Divider />
          {result && !result.ok ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{result.error}</Alert>
            </Box>
          ) : decodedFile ? (
            <FilePreview
              bytes={decodedFile.bytes}
              mime={decodedFile.info.mime}
              image={decodedFile.info.image}
              title={
                decodedFile.info.image
                  ? `Imagen ${decodedFile.info.label}`
                  : `No es texto: parece un archivo ${decodedFile.info.label}`
              }
              subtitle={describe(decodedFile.info, decodedFile.bytes.length)}
              action={
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={downloadDecoded}
                >
                  Descargar
                </Button>
              }
            />
          ) : (
            <>
              <Box component="pre" className="encode-output" aria-label="Resultado">
                {outputText.length > DISPLAY_MAX ? outputText.slice(0, DISPLAY_MAX) : outputText}
              </Box>
              {outputText.length > DISPLAY_MAX && (
                <Typography variant="caption" sx={{ color: 'text.secondary', px: 2, pb: 1 }}>
                  Se muestran los primeros {DISPLAY_MAX.toLocaleString('es')} caracteres. Copiar
                  copia el resultado completo.
                </Typography>
              )}
            </>
          )}
        </Card>
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopied(false)}>
          Copiado al portapapeles
        </Alert>
      </Snackbar>
    </Box>
  );
}
