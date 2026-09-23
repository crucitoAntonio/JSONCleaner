import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { Side } from '../../../shared/types';
import { formatBytes } from '../../../shared/lib/format';
import type { SavedDoc } from '../model/saved-docs';
import { STORAGE_SOFT_LIMIT } from '../model/saved-docs';

interface SavedDocsSidebarProps {
  docs: SavedDoc[];
  usageBytes: number;
  onOpen: (doc: SavedDoc, side: Side) => void;
  onRename: (doc: SavedDoc) => void;
  onDelete: (doc: SavedDoc) => void;
}

function StorageMeter({ bytes }: { bytes: number }) {
  const pct = Math.min(100, (bytes / STORAGE_SOFT_LIMIT) * 100);
  const used = formatBytes(bytes) + ' / ' + formatBytes(STORAGE_SOFT_LIMIT);
  const [color, label] =
    pct >= 100
      ? (['error', used + ' — límite alcanzado, borra documentos viejos'] as const)
      : pct >= 80
        ? (['warning', used + ' — casi lleno, considera borrar documentos viejos'] as const)
        : (['primary', used + ' usados'] as const);
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 0.75,
          color: color === 'primary' ? 'text.secondary' : `${color}.main`,
          fontWeight: color === 'primary' ? 400 : 600,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function OpenButton({ side, onClick }: { side: Side; onClick: () => void }) {
  const letter = side === 'left' ? 'A' : 'B';
  return (
    <Tooltip title={`Abrir en el panel ${side === 'left' ? 'izquierdo' : 'derecho'} (${letter})`}>
      <IconButton size="small" onClick={onClick} aria-label={'Abrir en ' + letter}>
        <FolderOpenIcon fontSize="inherit" />
        <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, ml: 0.25 }}>
          {letter}
        </Typography>
      </IconButton>
    </Tooltip>
  );
}

export function SavedDocsSidebar({
  docs,
  usageBytes,
  onOpen,
  onRename,
  onDelete,
}: SavedDocsSidebarProps) {
  return (
    <Card
      sx={{
        width: { xs: '100%', md: 270 },
        flexShrink: 0,
        maxHeight: { xs: 240, md: 'none' },
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 1,
      }}
    >
      <Typography
        variant="overline"
        sx={{ px: 2, pt: 1.5, pb: 0.5, color: 'text.secondary', fontWeight: 700 }}
      >
        Archivos guardados
      </Typography>
      <StorageMeter bytes={usageBytes} />
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 1 }}>
        {docs.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textAlign: 'center', px: 1, py: 2 }}
          >
            Aún no hay documentos guardados.
            <br />
            Usa el botón “Guardar” en cualquiera de los paneles.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {docs.map((doc) => (
              <Box
                key={doc.id}
                sx={{
                  p: 1,
                  pl: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'border-color .15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                  {doc.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {new Date(doc.savedAt).toLocaleString()} · {formatBytes(doc.content.length)}
                </Typography>
                <Stack direction="row" sx={{ mt: 0.5, ml: -0.75 }}>
                  <OpenButton side="left" onClick={() => onOpen(doc, 'left')} />
                  <OpenButton side="right" onClick={() => onOpen(doc, 'right')} />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Renombrar">
                    <IconButton size="small" onClick={() => onRename(doc)} aria-label="Renombrar">
                      <EditOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(doc)}
                      aria-label="Eliminar"
                    >
                      <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  );
}
