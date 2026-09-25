import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const EDITOR_URL = 'https://editor.swagger.io/';

// Editor oficial de Swagger incrustado. App.tsx solo lo monta la primera vez que se abre la
// pestaña, así la app no contacta swagger.io si nunca se usa.
export function SwaggerEditor() {
  const [showNotice, setShowNotice] = useState(true);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        gap: 1.5,
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
      }}
    >
      {showNotice && (
        <Alert
          severity="info"
          action={
            <>
              <Button
                color="inherit"
                size="small"
                endIcon={<OpenInNewIcon />}
                href={EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir aparte
              </Button>
              <IconButton
                color="inherit"
                size="small"
                aria-label="Cerrar aviso"
                onClick={() => setShowNotice(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
        >
          Editor oficial de swagger.io, cargado desde su sitio (con sus propias cookies y
          analítica). Si tu spec es confidencial, genera los modelos Kotlin/Java en la pestaña
          Modelos, que procesa todo en tu navegador.
        </Alert>
      )}
      <Card sx={{ flex: 1, minHeight: 0, boxShadow: 1, display: 'flex' }}>
        <Box
          component="iframe"
          src={EDITOR_URL}
          title="Swagger Editor"
          sx={{ flex: 1, border: 0, width: '100%', height: '100%', bgcolor: '#fff' }}
        />
      </Card>
    </Box>
  );
}
