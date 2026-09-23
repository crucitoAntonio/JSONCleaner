import { createTheme } from '@mui/material/styles';

// Clave de localStorage donde MUI guarda la preferencia ('light' | 'dark' | 'system').
// El script inline de index.html la lee antes del primer pintado: mantener ambas iguales.
export const THEME_STORAGE_KEY = 'jsonCleaner.theme';

export const theme = createTheme({
  // MUI escribe <html data-theme="light|dark">; tokens.css usa el mismo selector.
  cssVariables: { colorSchemeSelector: '[data-theme="%s"]' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4f46e5' },
        background: { default: '#f4f4f6', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#818cf8' },
        background: { default: '#0e0e11', paper: '#17171b' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});
