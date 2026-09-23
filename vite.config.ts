import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Tamaños esperados: React + MUI ~600 KB (~185 KB gzip) en el chunk principal, y quicktype
  // ~1.1 MB (~325 KB gzip) en el chunk de la pestaña Modelos, que se carga bajo demanda.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
