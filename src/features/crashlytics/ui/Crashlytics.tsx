import { useCallback, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { downloadText } from '../../../shared/lib/download';
import { normalizeTraceText } from '../model/formatter';
import { syntaxHighlightTrace } from '../model/tokenizer';
import './crashlytics.css';

const CRASH_PKG_KEY = 'jsonCleaner.crashPkg';

function readPkg(): string {
  try {
    return localStorage.getItem(CRASH_PKG_KEY) || '';
  } catch {
    return '';
  }
}

const LEGEND = [
  { label: 'Tu app', color: 'var(--trace-app)' },
  { label: 'Android/AndroidX', color: 'var(--mui-palette-text-secondary)' },
  { label: 'Java/Kotlin', color: 'var(--mui-palette-text-disabled)' },
  { label: 'Librerías', color: 'var(--trace-lib)' },
  { label: 'Excepción', color: 'var(--trace-header)' },
];

export function Crashlytics() {
  const [trace, setTrace] = useState('');
  const [pkg, setPkg] = useState(readPkg);
  const [copied, setCopied] = useState(false);

  const trimmedPkg = pkg.trim();
  const highlight = useCallback(
    (text: string) => syntaxHighlightTrace(text, trimmedPkg),
    [trimmedPkg],
  );

  const actions = [
    {
      title: 'Formatear (acomoda indentación y agrupa frames repetidos)',
      icon: <AutoAwesomeIcon fontSize="small" />,
      primary: true,
      onClick: () => setTrace((t) => normalizeTraceText(t)),
    },
    {
      title: 'Copiar',
      icon: <ContentCopyIcon fontSize="small" />,
      onClick: () => {
        if (trace) void navigator.clipboard.writeText(trace).then(() => setCopied(true));
      },
    },
    {
      title: 'Descargar',
      icon: <DownloadIcon fontSize="small" />,
      onClick: () =>
        trace && downloadText(trace, 'crash_trace_' + Date.now() + '.txt', 'text/plain'),
    },
    { title: 'Limpiar', icon: <ClearAllIcon fontSize="small" />, onClick: () => setTrace('') },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1 }}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{ flex: '1 1 0', minWidth: 0, color: 'text.secondary' }}
          title="Pega una traza de excepción (Crashlytics / Logcat) para acomodarla y resaltar tus clases vs. framework y librerías."
        >
          Pega una traza de excepción (Crashlytics / Logcat) para acomodarla y resaltar tus clases
          vs. framework y librerías.
        </Typography>
        <TextField
          size="small"
          label="Paquete de tu app"
          placeholder="ej. com.pixelquest.game"
          value={pkg}
          onChange={(e) => {
            setPkg(e.target.value);
            try {
              localStorage.setItem(CRASH_PKG_KEY, e.target.value);
            } catch {
              // Sin localStorage el paquete solo dura esta sesión.
            }
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{
            htmlInput: { spellCheck: false, style: { fontFamily: 'var(--mono)' } },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Inventory2OutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', px: { xs: 1.5, sm: 2 }, pb: 2 }}>
        <Card sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', boxShadow: 1 }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Traza
            </Typography>
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
              {actions.map((a) => (
                <Tooltip key={a.title} title={a.title}>
                  <IconButton
                    size="small"
                    onClick={a.onClick}
                    aria-label={a.title}
                    sx={
                      a.primary
                        ? {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            mr: 0.5,
                            '&:hover': { bgcolor: 'primary.dark' },
                          }
                        : undefined
                    }
                  >
                    {a.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Stack>
          <Divider />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, px: 2, py: 1 }}>
            {LEGEND.map((l) => (
              <Stack key={l.label} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: l.color }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {l.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Divider />
          <CodeEditor
            value={trace}
            onChange={setTrace}
            highlight={highlight}
            placeholder="Pega aquí la traza de Crashlytics..."
            ariaLabel="Traza de excepción"
          />
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
