import { useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CATEGORIES, ROUTES } from './routes';
import type { Category, Route, View } from './routes';

export function isPlainClick(e: MouseEvent<HTMLElement>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

interface NavProps {
  view: View | null;
  onOpen: (route: Route) => void;
  viewIcons: Record<View, ReactElement>;
  categoryIcons: Record<Category, ReactElement>;
}

const itemSx = (active: boolean) => ({
  minHeight: 56,
  minWidth: 0,
  px: { xs: 1, sm: 1.5 },
  borderRadius: 0,
  textTransform: 'none',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  color: active ? 'primary.main' : 'text.secondary',
  boxShadow: active ? 'inset 0 -2px 0 currentColor' : 'none',
  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
});

const labelSx = { display: { xs: 'none', sm: 'inline' } };

function CategoryMenu({
  label,
  icon,
  routes,
  view,
  onOpen,
  viewIcons,
}: {
  label: string;
  icon: ReactElement;
  routes: Route[];
  view: View | null;
  onOpen: (route: Route) => void;
  viewIcons: Record<View, ReactElement>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const active = routes.some((r) => r.view === view);
  const activeRoute = routes.find((r) => r.view === view);

  return (
    <>
      <Tooltip title={label} disableHoverListener={!!anchor}>
        <Button
          sx={itemSx(active)}
          startIcon={activeRoute ? viewIcons[activeRoute.view] : icon}
          endIcon={<ExpandMoreIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          aria-label={label}
        >
          <Box component="span" sx={labelSx}>
            {activeRoute ? activeRoute.label : label}
          </Box>
        </Button>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {routes.map((r) => (
          <MenuItem
            key={r.view}
            component="a"
            href={r.path}
            selected={r.view === view}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              setAnchor(null);
              if (!isPlainClick(e)) return;
              e.preventDefault();
              if (r.view !== view) onOpen(r);
            }}
          >
            <ListItemIcon>{viewIcons[r.view]}</ListItemIcon>
            <ListItemText primary={r.label} secondary={r.title} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function Nav({ view, onOpen, viewIcons, categoryIcons }: NavProps) {
  const featured = ROUTES.filter((r) => r.featured);

  return (
    <Box
      component="nav"
      sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', overflowX: 'auto' }}
    >
      {featured.map((r) => (
        <Button
          key={r.view}
          component="a"
          href={r.path}
          sx={itemSx(r.view === view)}
          startIcon={viewIcons[r.view]}
          aria-label={r.label}
          aria-current={r.view === view ? 'page' : undefined}
          onClick={(e: MouseEvent<HTMLAnchorElement>) => {
            if (!isPlainClick(e)) return;
            e.preventDefault();
            if (r.view !== view) onOpen(r);
          }}
        >
          <Box component="span" sx={labelSx}>
            {r.label}
          </Box>
        </Button>
      ))}
      {CATEGORIES.map((c) => {
        const routes = ROUTES.filter((r) => r.category === c.id && !r.featured);
        if (routes.length === 0) return null;
        return (
          <CategoryMenu
            key={c.id}
            label={c.label}
            icon={categoryIcons[c.id]}
            routes={routes}
            view={view}
            onOpen={onOpen}
            viewIcons={viewIcons}
          />
        );
      })}
    </Box>
  );
}
