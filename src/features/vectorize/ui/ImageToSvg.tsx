import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { downloadText } from '../../../shared/lib/download';
import { formatBytes } from '../../../shared/lib/format';
import { track } from '../../../shared/lib/analytics';
import { HEAVY_SVG_BYTES, MAX_TRACE_SIDE, PRESETS, fitSize, svgStats } from '../model/settings';
import type { PresetId, TraceSettings } from '../model/settings';
import type { TraceRequest, TraceResponse } from './trace.worker';
import '../../../shared/ui/styles/checkerboard.css';
import './vectorize.css';

interface LoadedImage {
  name: string;
  url: string;
  imgd: ImageData;
  originalWidth: number;
  originalHeight: number;
  scaled: boolean;
}

type TraceResult = { svg: string } | { error: string } | null;

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';

async function readImage(file: File): Promise<Omit<LoadedImage, 'url' | 'name'>> {
  const bitmap = await createImageBitmap(file);
  const { width, height, scaled } = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const result = {
    imgd: ctx.getImageData(0, 0, width, height),
    originalWidth: bitmap.width,
    originalHeight: bitmap.height,
    scaled,
  };
  bitmap.close();
  return result;
}

function sameSettings(a: TraceSettings, b: TraceSettings): boolean {
  return (Object.keys(a) as (keyof TraceSettings)[]).every((k) => a[k] === b[k]);
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

export function ImageToSvg() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [settings, setSettings] = useState<TraceSettings>(PRESETS[0]!.settings);
  const [result, setResult] = useState<TraceResult>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const urlRef = useRef<string | null>(null);

  const preset: PresetId | null =
    PRESETS.find((p) => sameSettings(p.settings, settings))?.id ?? null;
  const svg = result && 'svg' in result ? result.svg : null;
  const stats = useMemo(() => (svg ? svgStats(svg) : null), [svg]);
  const svgSrc = useMemo(
    () => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null),
    [svg],
  );

  useEffect(() => {
    const worker = new Worker(new URL('./trace.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<TraceResponse>) => {
      if (e.data.id !== requestId.current) return;
      setResult(
        'svg' in e.data
          ? { svg: e.data.svg }
          : { error: 'No se pudo vectorizar la imagen. Prueba con menos colores.' },
      );
      setBusy(false);
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!image) return;
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      setBusy(true);
      const data = image.imgd.data.slice();
      const request: TraceRequest = {
        id,
        width: image.imgd.width,
        height: image.imgd.height,
        data,
        settings,
      };
      workerRef.current?.postMessage(request, [data.buffer]);
    }, 250);
    return () => clearTimeout(timer);
  }, [image, settings]);

  const loadFile = async (file: File) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setLoadError('Carga una imagen PNG, JPG, WebP, GIF o BMP.');
      return;
    }
    try {
      const read = await readImage(file);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      requestId.current++;
      setResult(null);
      setImage({ ...read, name: file.name || 'imagen', url });
      setLoadError(null);
      track('vectorize_load');
    } catch {
      setLoadError('No se pudo leer la imagen. Usa PNG, JPG o WebP.');
    }
  };

  const clear = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    requestId.current++;
    setImage(null);
    setResult(null);
    setBusy(false);
    setLoadError(null);
  };

  const update = (patch: Partial<TraceSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const baseName = image ? image.name.replace(/\.[^.]+$/, '') || 'imagen' : 'imagen';

  const download = () => {
    if (!svg) return;
    downloadText(svg, `${baseName}.svg`, 'image/svg+xml');
    track('vectorize_download', { preset: preset ?? 'custom' });
  };

  const copy = () => {
    if (!svg) return;
    track('vectorize_copy', { preset: preset ?? 'custom' });
    void navigator.clipboard.writeText(svg).then(() => setCopied(true));
  };

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void loadFile(f);
  };

  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    const f = e.clipboardData.files[0];
    if (!f) return;
    e.preventDefault();
    void loadFile(f);
  };

  const cardSx = {
    flex: 1,
    minWidth: 0,
    minHeight: 220,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 1,
  } as const;

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}
      onPaste={onPaste}
      tabIndex={-1}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 3,
          rowGap: 1,
          px: { xs: 1.5, sm: 2 },
          py: 1,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={preset}
          onChange={(_, id: PresetId | null) => {
            const p = PRESETS.find((x) => x.id === id);
            if (p) setSettings(p.settings);
          }}
          aria-label="Tipo de imagen"
        >
          {PRESETS.map((p) => (
            <Tooltip key={p.id} title={p.hint}>
              <ToggleButton value={p.id} sx={{ px: 1.5 }}>
                {p.label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 200 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            Colores: {settings.blackAndWhite ? 2 : settings.colors}
          </Typography>
          <Slider
            size="small"
            min={2}
            max={32}
            value={settings.blackAndWhite ? 2 : settings.colors}
            disabled={settings.blackAndWhite}
            onChange={(_, v) => update({ colors: v as number })}
            aria-label="Número de colores"
            sx={{ width: 110 }}
          />
        </Stack>
        <Tooltip title="Descarta manchas más pequeñas que este número de píxeles: limpia ruido y reduce el tamaño del SVG">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 220 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
              Ignorar manchas &lt; {settings.minArea} px
            </Typography>
            <Slider
              size="small"
              min={0}
              max={64}
              value={settings.minArea}
              onChange={(_, v) => update({ minArea: v as number })}
              aria-label="Tamaño mínimo de mancha"
              sx={{ width: 110 }}
            />
          </Stack>
        </Tooltip>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={settings.smooth}
              onChange={(e) => update({ smooth: e.target.checked })}
            />
          }
          label={<Typography variant="body2">Suavizar</Typography>}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={settings.removeBackground}
              onChange={(e) => update({ removeBackground: e.target.checked })}
            />
          }
          label={<Typography variant="body2">Quitar fondo</Typography>}
        />
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
          overflow: { xs: 'auto', md: 'visible' },
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
        >
          <PanelHeader title="Imagen">
            <Tooltip title="Cargar imagen">
              <IconButton
                size="small"
                onClick={() => fileInput.current?.click()}
                aria-label="Cargar imagen"
              >
                <UploadFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Limpiar">
              <IconButton size="small" onClick={clear} aria-label="Limpiar">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = '';
              }}
            />
          </PanelHeader>
          <Divider />
          {loadError && (
            <Alert severity="error" onClose={() => setLoadError(null)} sx={{ m: 1.5, mb: 0 }}>
              {loadError}
            </Alert>
          )}
          {image ? (
            <Stack sx={{ flex: 1, minHeight: 0, p: 2, gap: 1 }}>
              <Box className="vectorize-preview checkerboard">
                <img src={image.url} alt={image.name} />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {image.name} · {image.originalWidth} × {image.originalHeight} px
                {image.scaled &&
                  ` · se vectoriza a ${image.imgd.width} × ${image.imgd.height} px (máx. ${MAX_TRACE_SIDE})`}
              </Typography>
            </Stack>
          ) : (
            <Box
              component="button"
              type="button"
              className="vectorize-drop"
              onClick={() => fileInput.current?.click()}
            >
              <ImageOutlinedIcon sx={{ fontSize: 48 }} />
              <Typography sx={{ fontWeight: 600 }}>
                Arrastra, pega (⌘/Ctrl + V) o carga una imagen
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                PNG, JPG o WebP. Funciona mejor con logos e íconos de pocos colores.
              </Typography>
            </Box>
          )}
        </Card>

        <Card sx={cardSx}>
          <PanelHeader title="SVG">
            {busy && <CircularProgress size={16} sx={{ mr: 1 }} />}
            {stats && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                {formatBytes(stats.bytes)} · {stats.paths.toLocaleString('es')} formas
              </Typography>
            )}
            <Tooltip title="Copiar código SVG">
              <span>
                <IconButton size="small" onClick={copy} disabled={!svg} aria-label="Copiar SVG">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </PanelHeader>
          <Divider />
          {result && 'error' in result ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{result.error}</Alert>
            </Box>
          ) : svgSrc && stats ? (
            <Stack sx={{ flex: 1, minHeight: 0, p: 2, gap: 1.5 }}>
              {stats.bytes > HEAVY_SVG_BYTES && (
                <Alert severity="warning">
                  El SVG es pesado ({formatBytes(stats.bytes)}). Si es una foto, un SVG no le
                  conviene; para logos, baja los colores o sube «Ignorar manchas».
                </Alert>
              )}
              <Box className="vectorize-preview checkerboard" sx={{ opacity: busy ? 0.5 : 1 }}>
                <img src={svgSrc} alt="Resultado en SVG" />
              </Box>
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={download}>
                  Descargar {baseName}.svg
                </Button>
                <Button startIcon={<ContentCopyIcon />} onClick={copy}>
                  Copiar código
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
              {busy ? (
                <CircularProgress />
              ) : (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  Aquí verás la imagen convertida a vectores.
                </Typography>
              )}
            </Box>
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
          SVG copiado al portapapeles
        </Alert>
      </Snackbar>
    </Box>
  );
}
