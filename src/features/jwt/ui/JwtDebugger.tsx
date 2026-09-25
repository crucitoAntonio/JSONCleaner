import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { CodeEditor } from '../../../shared/ui/CodeEditor';
import { syntaxHighlightText } from '../../../shared/lib/highlight-json';
import { track } from '../../../shared/lib/analytics';
import { highlightJwt, inspectJwt } from '../model/jwt';
import type { JsonObject, JwtInfo } from '../model/jwt';
import { keyKindFor, verifyJwt } from '../model/verify';
import type { VerifyResult } from '../model/verify';
import { SAMPLE_SECRET, SAMPLE_TOKEN } from '../model/sample';
import './jwt.css';

interface Verification {
  token: string;
  key: string;
  base64: boolean;
  result: VerifyResult;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function JsonBlock({ value }: { value: JsonObject }) {
  const html = useMemo(() => syntaxHighlightText(JSON.stringify(value, null, 2)), [value]);
  return <pre className="jwt-pre" dangerouslySetInnerHTML={{ __html: html }} />;
}

function StatusAlert({ jwt }: { jwt: JwtInfo }) {
  const exp = jwt.times.find((t) => t.claim === 'exp');
  const nbf = jwt.times.find((t) => t.claim === 'nbf');
  switch (jwt.status) {
    case 'expired':
      return (
        <Alert severity="error">
          Expiró {exp?.relative} ({exp?.date.toLocaleString('es')}).
        </Alert>
      );
    case 'not-yet-valid':
      return (
        <Alert severity="warning">
          Todavía no es válido: lo será {nbf?.relative} ({nbf?.date.toLocaleString('es')}).
        </Alert>
      );
    case 'valid':
      return (
        <Alert severity="success">
          Vigente: expira {exp?.relative} ({exp?.date.toLocaleString('es')}).
        </Alert>
      );
    case 'no-exp':
      return <Alert severity="info">No tiene fecha de expiración (exp): nunca vence.</Alert>;
  }
}

function VerifyPanel({
  token,
  alg,
  initialKey,
}: {
  token: string;
  alg: unknown;
  initialKey: string;
}) {
  const [key, setKey] = useState(initialKey);
  const [base64, setBase64] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const kind = keyKindFor(alg);

  if (kind === 'unsupported') {
    return (
      <Alert severity="info">
        La verificación de firma admite HS, RS, PS y ES (256/384/512); este token usa "{String(alg)}
        ".
      </Alert>
    );
  }

  const current =
    verification &&
    verification.token === token &&
    verification.key === key &&
    verification.base64 === base64
      ? verification.result
      : null;

  const run = async () => {
    setBusy(true);
    const result = await verifyJwt(token, key, { secretIsBase64: base64 });
    setBusy(false);
    setVerification({ token, key, base64, result });
    track('jwt_verify', { result: result.status });
  };

  return (
    <Stack sx={{ gap: 1 }}>
      <TextField
        size="small"
        multiline
        minRows={kind === 'secret' ? 1 : 4}
        maxRows={10}
        label={kind === 'secret' ? 'Secreto' : 'Llave pública (PEM o JWK)'}
        placeholder={
          kind === 'secret' ? 'El secreto con el que se firmó' : '-----BEGIN PUBLIC KEY-----'
        }
        value={key}
        onChange={(e) => setKey(e.target.value)}
        slotProps={{
          htmlInput: {
            spellCheck: false,
            autoComplete: 'off',
            style: { fontFamily: 'var(--mono)' },
          },
        }}
      />
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<VerifiedOutlinedIcon />}
          onClick={() => void run()}
          disabled={busy}
        >
          Verificar firma
        </Button>
        {kind === 'secret' && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={base64}
                onChange={(e) => setBase64(e.target.checked)}
              />
            }
            label={<Typography variant="body2">El secreto está en Base64</Typography>}
          />
        )}
      </Stack>
      {current?.status === 'valid' && <Alert severity="success">Firma válida.</Alert>}
      {current?.status === 'invalid' && (
        <Alert severity="error">
          Firma inválida: el token fue modificado o {kind === 'secret' ? 'el secreto' : 'la llave'}{' '}
          no es la correcta.
        </Alert>
      )}
      {current?.status === 'error' && <Alert severity="warning">{current.message}</Alert>}
    </Stack>
  );
}

export function JwtDebugger() {
  const [token, setToken] = useState('');
  const [sampleLoads, setSampleLoads] = useState(0);
  const result = useMemo(() => inspectJwt(token), [token]);
  const hasText = token.trim() !== '';
  const decoded = result.ok ? result.jwt : null;

  const decodedId = decoded ? `${decoded.parts[0]}.${decoded.parts[1]}` : null;

  useEffect(() => {
    if (decodedId) track('jwt_decode');
  }, [decodedId]);

  const loadSample = () => {
    setToken(SAMPLE_TOKEN);
    setSampleLoads((n) => n + 1);
    track('jwt_sample');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        gap: 2,
        p: { xs: 1.5, sm: 2 },
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      <Card
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: { xs: 260, md: 0 },
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
            Token
          </Typography>
          <Stack direction="row" sx={{ ml: 'auto', gap: 0.25 }}>
            <Tooltip title="Cargar un token de ejemplo">
              <IconButton size="small" onClick={loadSample} aria-label="Cargar ejemplo">
                <ScienceOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Limpiar">
              <IconButton size="small" onClick={() => setToken('')} aria-label="Limpiar">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider />
        <CodeEditor
          value={token}
          onChange={setToken}
          highlight={highlightJwt}
          placeholder="Pega aquí un JWT (también acepta «Bearer eyJ…»)"
          ariaLabel="JSON Web Token"
        />
        <Divider />
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 2, py: 1 }}>
          <LockOutlinedIcon fontSize="small" sx={{ color: 'success.main' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Todo se procesa en tu navegador: el token y el secreto nunca salen de él ni se guardan.
          </Typography>
        </Stack>
      </Card>

      <Card
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 1,
          overflow: { md: 'auto' },
          flexShrink: 0,
        }}
      >
        <Stack sx={{ gap: 2, p: 2 }}>
          {!hasText && (
            <Typography sx={{ color: 'text.secondary' }}>
              Pega un JWT a la izquierda para ver su header, su payload, cuándo expira y verificar
              su firma.
            </Typography>
          )}
          {hasText && !result.ok && <Alert severity="error">{result.error}</Alert>}
          {decoded && (
            <>
              <Stack sx={{ gap: 1 }}>
                <StatusAlert jwt={decoded} />
                {decoded.warnings.map((w) => (
                  <Alert key={w} severity="warning">
                    {w}
                  </Alert>
                ))}
                {decoded.sensitive.length > 0 && (
                  <Alert severity="warning">
                    Posibles datos sensibles en el payload. El payload no está cifrado: cualquiera
                    que tenga el token puede leerlos.
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {decoded.sensitive.map((s) => (
                        <Chip
                          key={s.path}
                          size="small"
                          label={s.reason === 'email' ? `${s.path} (email)` : s.path}
                          sx={{ fontFamily: 'var(--mono)' }}
                        />
                      ))}
                    </Stack>
                  </Alert>
                )}
              </Stack>
              <Section title="Header">
                <JsonBlock value={decoded.header} />
              </Section>
              <Section title="Payload">
                <JsonBlock value={decoded.payload} />
              </Section>
              {decoded.times.length > 0 && (
                <Section title="Fechas">
                  <Table size="small">
                    <TableBody>
                      {decoded.times.map((t) => (
                        <TableRow key={t.claim}>
                          <TableCell sx={{ fontWeight: 600, pl: 0 }}>{t.label}</TableCell>
                          <TableCell>{t.date.toLocaleString('es')}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', pr: 0 }}>
                            {t.relative}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Section>
              )}
              <Section title="Firma">
                <VerifyPanel
                  key={sampleLoads}
                  token={token}
                  alg={decoded.header.alg}
                  initialKey={sampleLoads > 0 && token === SAMPLE_TOKEN ? SAMPLE_SECRET : ''}
                />
              </Section>
            </>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
