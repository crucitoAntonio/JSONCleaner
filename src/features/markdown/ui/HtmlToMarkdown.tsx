import { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { track } from '../../../shared/lib/analytics';
import { escapeHtml } from '../../../shared/lib/dom';
import { downloadText } from '../../../shared/lib/download';
import { DEFAULT_OPTIONS, htmlToMarkdown, looksLikeHtml } from '../model/html-to-markdown';

const DISPLAY_MAX = 200_000;
const ACCEPT = '.html,.htm,.xhtml,.txt';
const TIDY_HINT =
  'Convierte los escapes (\\n, \\") en texto real, quita las comillas que envuelven el HTML y junta los saltos de línea sobrantes';

function stamp(): string {
  return String(Date.now());
}

function ToolButton(props: { title: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Tooltip title={props.title}>
      <IconButton size="small" onClick={props.onClick} aria-label={props.title}>
        {props.icon}
      </IconButton>
    </Tooltip>
  );
}

export function HtmlToMarkdown() {
  const [html, setHtml] = useState('');
  const [onlyContent, setOnlyContent] = useState(DEFAULT_OPTIONS.onlyContent);
  const [images, setImages] = useState(DEFAULT_OPTIONS.images);
  const [tidy, setTidy] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const deferred = useDeferredValue(html);
  const result = useMemo(() => {
    try {
      return { markdown: htmlToMarkdown(deferred, { onlyContent, images, tidy }), error: '' };
    } catch (e) {
      return { markdown: '', error: e instanceof Error ? e.message : 'No se pudo convertir' };
    }
  }, [deferred, onlyContent, images, tidy]);

  const { markdown, error } = result;
  const shown = markdown.length > DISPLAY_MAX ? markdown.slice(0, DISPLAY_MAX) : markdown;
  const plainTextWarning = html.trim() !== '' && !looksLikeHtml(html);

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const hasFiles = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes('Files');
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    track('md_drop_file');
    loadFile(file);
  };

  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    const rich = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    if (!rich || looksLikeHtml(plain)) return;
    e.preventDefault();
    track('md_paste_rich');
    setHtml(rich);
  };

  const copy = () => {
    if (!markdown) return;
    track('md_copy');
    void navigator.clipboard.writeText(markdown).then(() => setToast('Markdown copiado'));
  };

  const download = () => {
    if (!markdown) return;
    track('md_download');
    downloadText(markdown, 'documento_' + stamp() + '.md', 'text/markdown');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1 }}
      >
        <Typography
          variant="body2"
          sx={{ flex: '1 1 260px', minWidth: 0, color: 'text.secondary' }}
        >
          Pega HTML, copia desde una página web o arrastra un archivo .html para obtener Markdown
          listo para pegar en una IA.
        </Typography>
        <Tooltip title={TIDY_HINT}>
          <FormControlLabel
            control={
              <Switch size="small" checked={tidy} onChange={(e) => setTidy(e.target.checked)} />
            }
            label="Quitar escapes y saltos de línea que estorban"
          />
        </Tooltip>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={onlyContent}
              onChange={(e) => setOnlyContent(e.target.checked)}
            />
          }
          label="Quitar menús y pie"
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={images} onChange={(e) => setImages(e.target.checked)} />
          }
          label="Incluir imágenes"
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
        }}
      >
        <Card
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPaste={onPaste}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 1,
            outline: dragging ? '2px dashed' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              HTML
            </Typography>
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
              <ToolButton
                title="Cargar archivo"
                icon={<UploadFileIcon fontSize="small" />}
                onClick={() => fileInput.current?.click()}
              />
              <ToolButton
                title="Limpiar"
                icon={<ClearAllIcon fontSize="small" />}
                onClick={() => setHtml('')}
              />
              <input
                ref={fileInput}
                type="file"
                hidden
                accept={ACCEPT}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                  e.target.value = '';
                }}
              />
            </Stack>
          </Stack>
          <Divider />
          <CodeEditor
            value={html}
            onChange={setHtml}
            highlight={escapeHtml}
            placeholder="Pega aquí el HTML, o arrastra un archivo .html..."
            ariaLabel="HTML de entrada"
          />
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 240,
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
              Markdown
            </Typography>
            {markdown && (
              <Chip size="small" variant="outlined" label={markdown.length + ' caracteres'} />
            )}
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
              <ToolButton
                title="Copiar"
                icon={<ContentCopyIcon fontSize="small" />}
                onClick={copy}
              />
              <ToolButton
                title="Descargar .md"
                icon={<DownloadIcon fontSize="small" />}
                onClick={download}
              />
            </Stack>
          </Stack>
          <Divider />
          {plainTextWarning && (
            <Alert severity="info" sx={{ m: 1.5, mb: 0 }}>
              Eso no parece HTML, así que se muestra como texto plano.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ m: 1.5, mb: 0 }}>
              {error}
            </Alert>
          )}
          <Box
            component="pre"
            tabIndex={0}
            aria-label="Markdown resultante"
            sx={{
              flex: 1,
              minHeight: 0,
              m: 0,
              p: '14px 16px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              lineHeight: 1.55,
              color: shown ? 'text.primary' : 'text.secondary',
            }}
          >
            {shown || 'El Markdown aparece aquí.'}
          </Box>
          {markdown.length > DISPLAY_MAX && (
            <Alert severity="info" sx={{ m: 1.5, mt: 0 }}>
              Solo se muestran los primeros {DISPLAY_MAX.toLocaleString('es')} caracteres. Copiar y
              Descargar incluyen todo.
            </Alert>
          )}
        </Card>
      </Box>

      <Snackbar
        open={toast !== ''}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
