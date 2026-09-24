import { useEffect, useState } from 'react';
import type { FocusEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import { track } from '../../../shared/lib/analytics';
import type { HideReason } from '../model/timing';
import {
  KOFI_URL,
  expandDelay,
  goneUntilFor,
  hiddenUntilFor,
  isGone,
  isLaunched,
  loadGoneUntil,
  loadHiddenUntil,
  loadUnlocked,
  saveGoneUntil,
  saveHiddenUntil,
  saveUnlocked,
} from '../model/timing';

const GONE_EVENT = 'jsonCleaner:support-gone';
const SHOW_EVENT = 'jsonCleaner:support-show';

export function hideSupportForAWeek(): void {
  saveGoneUntil(goneUntilFor(loadGoneUntil()));
  window.dispatchEvent(new Event(GONE_EVENT));
}

export function showSupportNow(): void {
  saveUnlocked();
  saveGoneUntil(0);
  window.dispatchEvent(new Event(SHOW_EVENT));
}

const EDGE = 28;

export function SupportCard() {
  const [unlocked, setUnlocked] = useState(
    () => import.meta.env.DEV || isLaunched() || loadUnlocked(),
  );
  const [hiddenUntil, setHiddenUntil] = useState(loadHiddenUntil);
  const [goneUntil, setGoneUntil] = useState(loadGoneUntil);
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const expanded = open || peek;

  useEffect(() => {
    if (!unlocked) return;
    const delay = expandDelay(hiddenUntil);
    if (delay === null) return;
    const timer = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(timer);
  }, [unlocked, hiddenUntil]);

  useEffect(() => {
    const onGone = () => setGoneUntil(loadGoneUntil());
    const onShow = () => {
      setUnlocked(true);
      setGoneUntil(0);
      setOpen(true);
    };
    window.addEventListener(GONE_EVENT, onGone);
    window.addEventListener(SHOW_EVENT, onShow);
    return () => {
      window.removeEventListener(GONE_EVENT, onGone);
      window.removeEventListener(SHOW_EVENT, onShow);
    };
  }, []);

  const hide = (reason: HideReason) => {
    const until = hiddenUntilFor(reason, hiddenUntil);
    saveHiddenUntil(until);
    setHiddenUntil(until);
    setOpen(false);
    setPeek(false);
  };

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setPeek(false);
  };

  if (!unlocked || isGone(goneUntil)) return null;

  return (
    <Paper
      elevation={6}
      role="complementary"
      aria-label="Apoya el proyecto"
      onMouseEnter={() => setPeek(true)}
      onMouseLeave={() => setPeek(false)}
      onFocus={() => setPeek(true)}
      onBlur={onBlur}
      sx={{
        position: 'fixed',
        left: 0,
        bottom: { xs: 88, sm: 24 },
        zIndex: 'fab',
        width: 300,
        maxWidth: 'calc(100vw - 16px)',
        display: 'flex',
        overflow: 'hidden',
        borderRadius: '0 12px 12px 0',
        transform: expanded ? 'none' : `translateX(calc(-100% + ${EDGE}px))`,
        transition: 'transform 250ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, p: 2, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
            ¿Te ahorró tiempo? ☕
          </Typography>
          <Tooltip title="Ocultar por 5 minutos">
            <IconButton
              size="small"
              aria-label="Ocultar por 5 minutos"
              onClick={() => {
                track('support_dismiss');
                hide('dismiss');
              }}
              sx={{ mt: -0.75, mr: -0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
          Estas herramientas son gratis y sin anuncios. Si te sirvieron, puedes invitarme un café.
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<LocalCafeOutlinedIcon />}
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            track('donate_click');
            hide('donate');
          }}
        >
          Invitar un café
        </Button>
      </Box>
      <ButtonBase
        aria-label="Mostrar"
        tabIndex={-1}
        onClick={() => setPeek(true)}
        sx={{
          width: EDGE,
          flexShrink: 0,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <LocalCafeOutlinedIcon sx={{ fontSize: 18 }} />
      </ButtonBase>
    </Paper>
  );
}
