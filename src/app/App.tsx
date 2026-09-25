import { Suspense, lazy, useEffect } from 'react';
import type { ComponentType, ReactElement } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import CssBaseline from '@mui/material/CssBaseline';
import Link from '@mui/material/Link';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import ApiIcon from '@mui/icons-material/Api';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import DataObjectIcon from '@mui/icons-material/DataObject';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { JsonCleaner } from '../features/json-cleaner';
import { Crashlytics } from '../features/crashlytics';
import { SwaggerEditor } from '../features/swagger';
import { SupportCard } from '../features/support';
import { JwtDebugger } from '../features/jwt';
import { Encoder } from '../features/encode';
import { track } from '../shared/lib/analytics';
import { THEME_STORAGE_KEY, theme } from './theme';
import { ROUTES, SITE_NAME, pageTitle, routeFor } from './routes';
import type { Category, Route, View } from './routes';
import { Nav, isPlainClick } from './Nav';
import { useRoute } from './useRoute';

// quicktype pesa ~1 MB: el generador de modelos se descarga solo al abrir su pestaña.
const ModelGenerator = lazy(() =>
  import('../features/codegen').then((m) => ({ default: m.ModelGenerator })),
);

const VIEWS: Record<View, { icon: ReactElement; Component: ComponentType }> = {
  jsoncleaner: { icon: <DataObjectIcon fontSize="small" />, Component: JsonCleaner },
  crashlytics: { icon: <BugReportOutlinedIcon fontSize="small" />, Component: Crashlytics },
  models: { icon: <ClassOutlinedIcon fontSize="small" />, Component: ModelGenerator },
  swagger: { icon: <ApiIcon fontSize="small" />, Component: SwaggerEditor },
  jwt: { icon: <KeyOutlinedIcon fontSize="small" />, Component: JwtDebugger },
  encode: { icon: <SwapHorizIcon fontSize="small" />, Component: Encoder },
};

const VIEW_ICONS = Object.fromEntries(
  Object.entries(VIEWS).map(([v, { icon }]) => [v, icon]),
) as Record<View, ReactElement>;

const CATEGORY_ICONS: Record<Category, ReactElement> = {
  datos: <StorageOutlinedIcon fontSize="small" />,
  depurar: <BugReportOutlinedIcon fontSize="small" />,
  codificar: <LockOutlinedIcon fontSize="small" />,
};

function NotFound({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Página no encontrada
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Esa dirección no existe. Estas son las herramientas:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ROUTES.map((r) => (
            <Link
              key={r.view}
              href={r.path}
              onClick={(e) => {
                if (!isPlainClick(e)) return;
                e.preventDefault();
                onOpen(r);
              }}
            >
              {r.label}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

type Mode = 'light' | 'system' | 'dark';

const MODES: { value: Mode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <LightModeOutlinedIcon fontSize="small" /> },
  {
    value: 'system',
    label: 'Según el sistema',
    icon: <SettingsBrightnessOutlinedIcon fontSize="small" />,
  },
  { value: 'dark', label: 'Oscuro', icon: <DarkModeOutlinedIcon fontSize="small" /> },
];

function ThemeSwitch() {
  const { mode, setMode } = useColorScheme();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode ?? 'system'}
      onChange={(_, m: Mode | null) => m && setMode(m)}
      aria-label="Tema"
      sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.5 } }}
    >
      {MODES.map((m) => (
        <Tooltip key={m.value} title={m.label}>
          <ToggleButton value={m.value} aria-label={m.label}>
            {m.icon}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}

export function App() {
  const { view, visited, navigate } = useRoute();
  const open = (route: Route) => {
    navigate(route.path);
    track('tab_open', { tab: route.view });
  };

  useEffect(() => {
    document.title = view ? pageTitle(routeFor(view)) : `Página no encontrada · ${SITE_NAME}`;
  }, [view]);

  return (
    <ThemeProvider theme={theme} modeStorageKey={THEME_STORAGE_KEY} defaultMode="system">
      <CssBaseline enableColorScheme />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar variant="dense" sx={{ gap: { xs: 1, sm: 2 }, minHeight: 56 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {'{ }'}
              </Box>
              <Typography
                sx={{ fontWeight: 700, whiteSpace: 'nowrap', display: { xs: 'none', md: 'block' } }}
              >
                {SITE_NAME}
              </Typography>
            </Box>
            <Nav view={view} onOpen={open} viewIcons={VIEW_ICONS} categoryIcons={CATEGORY_ICONS} />
            <ThemeSwitch />
          </Toolbar>
        </AppBar>

        {/* Cada vista se monta la primera vez que se abre y luego queda montada (oculta):
            cambiar de pestaña no pierde el texto pegado, y Swagger/Modelos no cargan nada
            hasta que se usan. */}
        {ROUTES.filter((r) => visited.has(r.view)).map(({ view: value }) => {
          const { Component } = VIEWS[value];
          return (
            <Box
              key={value}
              sx={{ flex: 1, minHeight: 0, minWidth: 0, display: view === value ? 'flex' : 'none' }}
            >
              <Suspense
                fallback={
                  <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                    <CircularProgress />
                  </Box>
                }
              >
                <Component />
              </Suspense>
            </Box>
          );
        })}
        {view === null && <NotFound onOpen={open} />}
      </Box>
      <SupportCard />
    </ThemeProvider>
  );
}
