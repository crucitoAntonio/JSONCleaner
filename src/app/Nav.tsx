import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, Modifier } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { loadNavOrder, mergeOrder, moveTo, saveNavOrder } from './nav-order';
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

const HOLD_MS = 500;
const MOVE_TOLERANCE = 10;
const CLICK_GUARD_MS = 80;

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

const lockToHorizontal: Modifier = ({ transform }) => ({ ...transform, y: 0 });

function SortableItem({
  id,
  onMove,
  swallowClick,
  children,
}: {
  id: string;
  onMove: (id: string, delta: number) => void;
  swallowClick: { current: boolean };
  children: ReactNode;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        onMove(id, e.key === 'ArrowLeft' ? -1 : 1);
      }}
      onClickCapture={(e: MouseEvent<HTMLElement>) => {
        if (!swallowClick.current) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => e.preventDefault()}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging && {
          scale: '1.06',
          boxShadow: 4,
          bgcolor: 'background.paper',
          cursor: 'grabbing',
          zIndex: 2,
          position: 'relative',
        }),
      }}
    >
      {children}
    </Box>
  );
}

export function Nav({ view, onOpen, viewIcons, categoryIcons }: NavProps) {
  const featured = ROUTES.filter((r) => r.featured);
  const categories = CATEGORIES.map((c) => ({
    category: c,
    routes: ROUTES.filter((r) => r.category === c.id && !r.featured),
  })).filter((c) => c.routes.length > 0);
  const defaults = [
    ...featured.map((r) => 'feat:' + r.view),
    ...categories.map((c) => 'cat:' + c.category.id),
  ];

  const [saved, setSaved] = useState<unknown>(loadNavOrder);
  const order = mergeOrder(saved, defaults);
  const swallowClick = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: HOLD_MS, tolerance: MOVE_TOLERANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: HOLD_MS, tolerance: MOVE_TOLERANCE },
    }),
  );

  const commit = (next: string[]) => {
    setSaved(next);
    saveNavOrder(next);
  };

  const guardClick = () => {
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, CLICK_GUARD_MS);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    guardClick();
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    commit(arrayMove(order, from, to));
  };

  const moveBy = (id: string, delta: number) => {
    const at = order.indexOf(id) + delta;
    if (at < 0 || at >= order.length) return;
    commit(moveTo(order, id, at));
  };

  const renderEntry = (id: string) => {
    if (id.startsWith('cat:')) {
      const entry = categories.find((c) => 'cat:' + c.category.id === id);
      if (!entry) return null;
      return (
        <CategoryMenu
          label={entry.category.label}
          icon={categoryIcons[entry.category.id]}
          routes={entry.routes}
          view={view}
          onOpen={onOpen}
          viewIcons={viewIcons}
        />
      );
    }
    const r = featured.find((f) => 'feat:' + f.view === id);
    if (!r) return null;
    return (
      <Button
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
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'stretch',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[lockToHorizontal]}
        autoScroll={{ threshold: { x: 0.2, y: 0 } }}
        onDragStart={() => navigator.vibrate?.(30)}
        onDragEnd={onDragEnd}
        onDragCancel={guardClick}
      >
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          {order.map((id) => (
            <SortableItem key={id} id={id} onMove={moveBy} swallowClick={swallowClick}>
              {renderEntry(id)}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  );
}
