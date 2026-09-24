// Google Analytics 4. Solo se activa en el build de producción y si hay ID (VITE_GA_ID en
// .env.production): en `npm run dev` y `npm test` no se manda nada.
// IMPORTANTE: nunca mandar contenido del usuario (JSON, trazas, nombres de documentos,
// paquetes); solo qué acción usó y parámetros de un conjunto fijo (pestaña, vista, lenguaje).

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const enabled = import.meta.env.PROD && !!GA_ID;

export function initAnalytics(): void {
  if (!enabled) return;
  window.dataLayer = window.dataLayer || [];
  // gtag.js espera el objeto `arguments` tal cual, no un arreglo.
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  } as Window['gtag'];
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID!);
  document.head.appendChild(script);
}

export function track(event: string, params?: Record<string, string>): void {
  if (!enabled) return;
  window.gtag('event', event, params);
}
