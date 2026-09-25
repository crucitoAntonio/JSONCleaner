import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { HOME_VIEW, ROUTES, SITE_NAME, SITE_URL, pageTitle, routeFor } from './src/app/routes.ts';
import { TOOL_CONTENT, jsonLdFor } from './src/app/seo.ts';
import type { Route } from './src/app/routes.ts';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function headFor(route: Route): string {
  const title = escapeHtml(pageTitle(route));
  const description = escapeHtml(route.description);
  const url = `${SITE_URL}${route.path}`;
  const jsonLd = JSON.stringify(jsonLdFor(route)).replace(/</g, '\\u003c');
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="es_MX" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.jpg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');
}

function rootFor(route: Route): string {
  const content = TOOL_CONTENT[route.view];
  if (!content) return '<div id="root"></div>';
  const p = (text: string) => `<p>${escapeHtml(text)}</p>`;
  const body = [
    `<h1>${escapeHtml(content.h1)}</h1>`,
    ...content.intro.map(p),
    '<h2>Qué puedes hacer</h2>',
    '<ul>',
    ...content.features.map((f) => `<li><h3>${escapeHtml(f.title)}</h3>${p(f.text)}</li>`),
    '</ul>',
    '<h2>Preguntas frecuentes</h2>',
    ...content.faq.map((f) => `<h3>${escapeHtml(f.q)}</h3>${p(f.a)}`),
  ].join('');
  return `<div id="root"><article class="prerender">${body}</article></div>`;
}

function routePages(): Plugin {
  const home = routeFor(HOME_VIEW);
  const homeHead = headFor(home);
  const homeRoot = rootFor(home);
  return {
    name: 'route-pages',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace('</head>', `  ${homeHead}\n  </head>`)
        .replace('<div id="root"></div>', homeRoot);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') this.error('index.html no está en el bundle');
      const html = String(index.source);
      if (!html.includes(homeHead) || !html.includes(homeRoot)) {
        this.error('index.html no tiene el <head> o el #root esperados');
      }

      for (const route of ROUTES) {
        this.emitFile({
          type: 'asset',
          fileName: `${route.path.slice(1)}/index.html`,
          source: html.replace(homeHead, headFor(route)).replace(homeRoot, rootFor(route)),
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
            routes: [
              {
                route: '/assets/*',
                headers: { 'cache-control': 'public, max-age=31536000, immutable' },
              },
              ...ROUTES.map((r) => ({ route: r.path, rewrite: `${r.path}/index.html` })),
            ],
            navigationFallback: {
              rewrite: '/index.html',
              exclude: ['/assets/*', '/sitemap.xml', '/robots.txt', '/*.{png,jpg,svg,ico}'],
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
