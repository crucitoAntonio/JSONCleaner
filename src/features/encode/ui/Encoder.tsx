import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { escapeHtml } from '../../../shared/lib/dom';
import { track } from '../../../shared/lib/analytics';
import { runCodec } from '../model/encode';
import type { Direction, EncodeMode } from '../model/encode';
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

function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', minHeight: 46 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
        {children}
      </Stack>
    </Stack>
  );
}

export function Encoder() {
  const [mode, setMode] = useState<EncodeMode>('base64');
  const [direction, setDirection] = useState<Direction>('encode');
  const [plusAsSpace, setPlusAsSpace] = useState(false);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => runCodec(mode, direction, input, { plusAsSpace }),
    [mode, direction, input, plusAsSpace],
  );
  const output = result.ok ? result.text : '';
  const verb = direction === 'encode' ? 'codificar' : 'decodificar';

  const swap = () => {
    if (!result.ok) return;
    setInput(output);
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
  };

  const copy = () => {
    if (!output) return;
    track('encode_run', { mode, dir: direction });
    void navigator.clipboard.writeText(output).then(() => setCopied(true));
  };

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
          onChange={(_, m: EncodeMode | null) => m && setMode(m)}
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
          onChange={(_, d: Direction | null) => d && setDirection(d)}
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
            flex: 1,
            minWidth: 0,
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 1,
          }}
        >
          <PanelHeader title="Entrada">
            <Tooltip title="Limpiar">
              <IconButton size="small" onClick={() => setInput('')} aria-label="Limpiar">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </PanelHeader>
          <Divider />
          <CodeEditor
            value={input}
            onChange={setInput}
            highlight={escapeHtml}
            placeholder={`Escribe o pega el texto a ${verb}…`}
            ariaLabel="Texto de entrada"
          />
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 1,
          }}
        >
          <PanelHeader title="Resultado">
            <Tooltip title="Usar el resultado como entrada e invertir la dirección">
              <span>
                <IconButton
                  size="small"
                  onClick={swap}
                  disabled={!result.ok || !output}
                  aria-label="Intercambiar"
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Copiar">
              <span>
                <IconButton size="small" onClick={copy} disabled={!output} aria-label="Copiar">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </PanelHeader>
          <Divider />
          {result.ok ? (
            <Box component="pre" className="encode-output" aria-label="Resultado">
              {output}
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{result.error}</Alert>
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
          Copiado al portapapeles
        </Alert>
      </Snackbar>
    </Box>
  );
}
