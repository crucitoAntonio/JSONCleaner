import { Suspense, lazy, useState } from 'react';
import type { ComponentType, ReactElement } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import CssBaseline from '@mui/material/CssBaseline';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
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
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { JsonCleaner } from '../features/json-cleaner';
import { Crashlytics } from '../features/crashlytics';
import { SwaggerEditor } from '../features/swagger';
import { THEME_STORAGE_KEY, theme } from './theme';

// quicktype pesa ~1 MB: el generador de modelos se descarga solo al abrir su pestaña.
const ModelGenerator = lazy(() =>
  import('../features/codegen').then((m) => ({ default: m.ModelGenerator })),
);

type View = 'jsoncleaner' | 'crashlytics' | 'models' | 'swagger';

const VIEWS: { value: View; label: string; icon: ReactElement; Component: ComponentType }[] = [
  {
    value: 'jsoncleaner',
    label: 'JSON Cleaner',
    icon: <DataObjectIcon fontSize="small" />,
    Component: JsonCleaner,
  },
  {
    value: 'crashlytics',
    label: 'Crashlytics',
    icon: <BugReportOutlinedIcon fontSize="small" />,
    Component: Crashlytics,
  },
  {
    value: 'models',
    label: 'Modelos',
    icon: <ClassOutlinedIcon fontSize="small" />,
    Component: ModelGenerator,
  },
  {
    value: 'swagger',
    label: 'Swagger',
    icon: <ApiIcon fontSize="small" />,
    Component: SwaggerEditor,
  },
];
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
  const [view, setView] = useState<View>('jsoncleaner');
  const [visited, setVisited] = useState<Set<View>>(() => new Set(['jsoncleaner']));
  const open = (v: View) => {
    setView(v);
    setVisited((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

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
                JSON Log Cleaner
              </Typography>
            </Box>
            <Tabs
              value={view}
              onChange={(_, v: View) => open(v)}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 56,
                '& .MuiTab-root': { minHeight: 56, textTransform: 'none', fontWeight: 600 },
              }}
              variant="scrollable"
              scrollButtons={false}
            >
              {VIEWS.map((v) => (
                <Tab
                  key={v.value}
                  value={v.value}
                  icon={v.icon}
                  iconPosition="start"
                  label={
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {v.label}
                    </Box>
                  }
                  aria-label={v.label}
                />
              ))}
            </Tabs>
            <ThemeSwitch />
          </Toolbar>
        </AppBar>

        {/* Cada vista se monta la primera vez que se abre y luego queda montada (oculta):
            cambiar de pestaña no pierde el texto pegado, y Swagger/Modelos no cargan nada
            hasta que se usan. */}
        {VIEWS.filter((v) => visited.has(v.value)).map(({ value, Component }) => (
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
        ))}
      </Box>
    </ThemeProvider>
  );
}
