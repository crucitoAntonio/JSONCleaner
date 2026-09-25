import { useCallback, useEffect, useState } from 'react';
import { viewFromPath } from './routes';
import type { View } from './routes';

function withView(visited: Set<View>, view: View | null): Set<View> {
  return view === null || visited.has(view) ? visited : new Set(visited).add(view);
}

export function useRoute() {
  const [view, setView] = useState(() => viewFromPath(window.location.pathname));
  const [visited, setVisited] = useState(() => withView(new Set(), view));

  const show = useCallback((v: View | null) => {
    setView(v);
    setVisited((s) => withView(s, v));
  }, []);

  useEffect(() => {
    const onPop = () => show(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  const navigate = useCallback(
    (path: string) => {
      if (path !== window.location.pathname) window.history.pushState(null, '', path);
      show(viewFromPath(path));
    },
    [show],
  );

  return { view, visited, navigate };
}
