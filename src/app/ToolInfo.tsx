import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';
import type { ToolContent } from './seo';

export function ToolInfo({ content }: { content: ToolContent }) {
  return (
    <Box
      component="article"
      sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Box
        component="details"
        sx={{
          '& > summary': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 48,
            px: { xs: 2, sm: 3 },
            cursor: 'pointer',
            listStyle: 'none',
            color: 'text.secondary',
            '&::-webkit-details-marker': { display: 'none' },
            '&:hover': { color: 'text.primary' },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          },
          '& > summary .chevron': { transition: 'transform 150ms' },
          '&[open] > summary .chevron': { transform: 'rotate(180deg)' },
        }}
      >
        <summary>
          <Typography
            component="h1"
            variant="subtitle2"
            sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
          >
            {content.h1}
          </Typography>
          <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Acerca de esta herramienta
          </Typography>
          <ExpandMoreIcon className="chevron" fontSize="small" />
        </summary>
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
          {content.intro.map((p) => (
            <Typography key={p} sx={{ mb: 1.5, color: 'text.secondary' }}>
              {p}
            </Typography>
          ))}

          <Typography component="h2" variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>
            Qué puedes hacer
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            {content.features.map((f) => (
              <Box component="li" key={f.title}>
                <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {f.text}
                </Typography>
              </Box>
            ))}
          </Box>

          <Typography component="h2" variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>
            Preguntas frecuentes
          </Typography>
          {content.faq.map((f) => (
            <Box key={f.q} sx={{ mb: 2 }}>
              <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {f.q}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {f.a}
              </Typography>
            </Box>
          ))}
        </Container>
      </Box>
    </Box>
  );
}
