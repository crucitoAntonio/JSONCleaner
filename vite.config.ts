import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { HOME_VIEW, ROUTES, SITE_URL, pageTitle, routeFor } from './src/app/routes.ts';
import type { Route } from './src/app/routes.ts';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function headFor(route: Route): string {
  return [
    `<title>${escapeHtml(pageTitle(route))}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<link rel="canonical" href="${SITE_URL}${route.path}" />`,
  ].join('\n    ');
}

function routePages(): Plugin {
  const homeHead = headFor(routeFor(HOME_VIEW));
  return {
    name: 'route-pages',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace('</head>', `  ${homeHead}\n  </head>`);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') this.error('index.html no está en el bundle');
      const html = String(index.source);
      if (!html.includes(homeHead)) this.error('index.html no tiene el <head> esperado');

      for (const route of ROUTES) {
        this.emitFile({
          type: 'asset',
          fileName: `${route.path.slice(1)}/index.html`,
          source: html.replace(homeHead, headFor(route)),
        });
      }

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...ROUTES.map((r) => `  <url><loc>${SITE_URL}${r.path}</loc></url>`),
          '</urlset>',
          '',
        ].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });

      this.emitFile({
        type: 'asset',
        fileName: 'staticwebapp.config.json',
        source: JSON.stringify(
          {
            routes: ROUTES.map((r) => ({ route: r.path, rewrite: `${r.path}/index.html` })),
            navigationFallback: {
              rewrite: '/index.html',
              exclude: ['/assets/*', '/sitemap.xml', '/robots.txt'],
            },
          },
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), routePages()],
  // Tamaños esperados: React + MUI ~600 KB (~185 KB gzip) en el chunk principal, y quicktype
  // ~1.1 MB (~325 KB gzip) en el chunk de la pestaña Modelos, que se carga bajo demanda.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
