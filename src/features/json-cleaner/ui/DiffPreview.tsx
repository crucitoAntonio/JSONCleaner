import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { LineOp } from '../model/diff-lines';
import { syntaxHighlightText } from '../model/highlight';

interface DiffPreviewProps {
  /** null cuando diffLines abortó por tamaño. */
  ops: LineOp[] | null;
  expanded: boolean;
  onToggle: () => void;
}

export function DiffPreview({ ops, expanded, onToggle }: DiffPreviewProps) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      square
      elevation={0}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        '&::before': { display: 'none' },
        // El editor de arriba conserva el resto del alto; el diff hace scroll propio.
        '& .MuiAccordionDetails-root': { maxHeight: '45vh', overflow: 'auto' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 40, bgcolor: 'action.hover' }}
      >
        <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          Diferencias (línea por línea)
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {ops ? (
          <pre className="diff-pre">
            {ops.map((op, i) => (
              <div
                key={i}
                className={
                  'diff-line' +
                  (op.type === 'equal'
                    ? ''
                    : op.type === 'remove'
                      ? ' diff-removed'
                      : ' diff-added')
                }
                dangerouslySetInnerHTML={{ __html: syntaxHighlightText(op.text) || '&nbsp;' }}
              />
            ))}
          </pre>
        ) : (
          <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
            Documentos muy grandes para el diff línea por línea. Usa la vista Árbol.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
