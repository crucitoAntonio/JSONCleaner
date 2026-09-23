import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { downloadText } from '../../../shared/lib/download';
import { escapeHtml } from '../../../shared/lib/dom';
import type { GenerateResult, TargetLang } from '../model/generate';
import { generateModels } from '../model/generate';
import { highlightCode } from '../model/highlight-code';
import './codegen.css';

const PKG_KEY = 'jsonCleaner.codegenPkg';
const DEFAULT_PKG = 'com.pixelquest.game.model';

const EXAMPLE_SPEC = `openapi: 3.0.3
info:
  title: PixelQuest API
  version: 1.0.0
paths: {}
components:
  schemas:
    Player:
      type: object
      required: [id, name]
      properties:
        id: { type: integer, format: int64 }
        name: { type: string }
        level: { type: integer }
        nickname: { type: string, nullable: true }
        status: { type: string, enum: [online, offline, away] }
        guild: { $ref: '#/components/schemas/Guild' }
        inventory:
          type: array
          items: { $ref: '#/components/schemas/Item' }
    Guild:
      type: object
      required: [id]
      properties:
        id: { type: string }
        name: { type: string }
    Item:
      type: object
      required: [sku, qty]
      properties:
        sku: { type: string }
        qty: { type: integer }
        price: { type: number, format: double }
`;

type State =
  | { status: 'idle' }
  | { status: 'loading'; previous: GenerateResult | null }
  | { status: 'ok'; result: GenerateResult }
  | { status: 'error'; message: string };

function readPkg(): string {
  try {
    return localStorage.getItem(PKG_KEY) || DEFAULT_PKG;
  } catch {
    return DEFAULT_PKG;
  }
}

function useGeneratedModels(
  text: string,
  lang: TargetLang,
  packageName: string,
  rootName: string,
): State {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    // Debounce: quicktype tarda unas decenas de ms; no vale la pena correrlo en cada tecla.
    const timer = setTimeout(() => {
      if (!text.trim()) {
        setState({ status: 'idle' });
        return;
      }
      setState((s) => ({
        status: 'loading',
        previous: s.status === 'ok' ? s.result : s.status === 'loading' ? s.previous : null,
      }));
      generateModels({ text, lang, packageName, rootName }).then(
        (result) => !cancelled && setState({ status: 'ok', result }),
        (e: unknown) =>
          !cancelled &&
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, lang, packageName, rootName]);

  return state;
}

export function ModelGenerator() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState<TargetLang>('kotlin');
  const [pkg, setPkg] = useState(readPkg);
  const [rootName, setRootName] = useState('Root');
  const [fileIdx, setFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const state = useGeneratedModels(text, lang, pkg, rootName);
  const result =
    state.status === 'ok' ? state.result : state.status === 'loading' ? state.previous : null;
  const files = result?.files ?? [];
  const file = files[Math.min(fileIdx, files.length - 1)];
  const outputHtml = useMemo(() => (file ? highlightCode(file.code) : ''), [file]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}
      >
        <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            Generador de modelos
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pega un JSON/YAML de datos o un spec Swagger/OpenAPI y obtén data classes de Kotlin o
            POJOs de Java. Todo se procesa en tu navegador.
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            color="primary"
            value={lang}
            onChange={(_, v: TargetLang | null) => {
              if (!v) return;
              setLang(v);
              setFileIdx(0);
            }}
          >
            <ToggleButton value="kotlin">Kotlin</ToggleButton>
            <ToggleButton value="java">Java</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            label="Paquete"
            value={pkg}
            onChange={(e) => {
              setPkg(e.target.value);
              try {
                localStorage.setItem(PKG_KEY, e.target.value);
              } catch {
                // Sin localStorage el paquete solo dura esta sesión.
              }
            }}
            sx={{ width: { xs: '100%', sm: 290 } }}
            slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: 'var(--mono)' } } }}
          />
          {result?.source !== 'openapi' && (
            <TextField
              size="small"
              label="Clase raíz"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              sx={{ width: 150 }}
              slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: 'var(--mono)' } } }}
            />
          )}
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
        <Card
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: { xs: 320, md: 0 },
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 1,
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Entrada
            </Typography>
            {result && (
              <Chip
                size="small"
                variant="outlined"
                label={result.source === 'openapi' ? 'Spec Swagger/OpenAPI' : 'Datos JSON/YAML'}
              />
            )}
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.5 }}>
              <Button
                size="small"
                startIcon={<ScienceOutlinedIcon />}
                onClick={() => {
                  setText(EXAMPLE_SPEC);
                  setFileIdx(0);
                }}
              >
                Ejemplo
              </Button>
              <Tooltip title="Limpiar">
                <IconButton size="small" onClick={() => setText('')} aria-label="Limpiar">
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Divider />
          <CodeEditor
            value={text}
            onChange={(v) => {
              setText(v);
              setFileIdx(0);
            }}
            highlight={escapeHtml}
            placeholder={
              'Pega aquí un JSON, un YAML o un spec Swagger/OpenAPI (openapi: 3.x / swagger: 2.0)...'
            }
            ariaLabel="Entrada JSON o YAML"
          />
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: { xs: 320, md: 0 },
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 1,
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {lang === 'kotlin' ? 'Kotlin' : 'Java'}
            </Typography>
            {state.status === 'loading' && <CircularProgress size={16} />}
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
              <Tooltip title="Copiar">
                <span>
                  <IconButton
                    size="small"
                    disabled={!file}
                    aria-label="Copiar"
                    onClick={() =>
                      file &&
                      void navigator.clipboard.writeText(file.code).then(() => setCopied(true))
                    }
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={file ? 'Descargar ' + file.name : 'Descargar'}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!file}
                    aria-label="Descargar"
                    onClick={() => file && downloadText(file.code, file.name, 'text/plain')}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <Divider />
          {files.length > 1 && (
            <>
              <Tabs
                value={Math.min(fileIdx, files.length - 1)}
                onChange={(_, i: number) => setFileIdx(i)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 38,
                  '& .MuiTab-root': {
                    minHeight: 38,
                    textTransform: 'none',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                  },
                }}
              >
                {files.map((f) => (
                  <Tab key={f.name} label={f.name} />
                ))}
              </Tabs>
              <Divider />
            </>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {state.status === 'error' ? (
              <Alert severity="error" sx={{ m: 2 }}>
                No se pudo generar: {state.message}
              </Alert>
            ) : file ? (
              <pre className="code-output" dangerouslySetInnerHTML={{ __html: outputHtml }} />
            ) : (
              <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
                Aquí aparecerán las clases generadas. Prueba con el botón “Ejemplo”.
              </Typography>
            )}
          </Box>
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
