import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// A simple plugin to inject a build timestamp into sw.js so it always updates
const updateServiceWorkerPlugin = () => {
  return {
    name: 'update-service-worker',
    writeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        const timestamp = new Date().getTime();
        fs.appendFileSync(swPath, `\n// Build timestamp: ${timestamp}\n`);
      }
    }
  }
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), updateServiceWorkerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
