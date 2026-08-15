import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    viteSingleFile(),
    {
      name: 'copy-to-bricks-html',
      closeBundle() {
        if (process.env.VITEST) return;
        const distDir = path.resolve(__dirname, 'dist');
        const indexPath = path.join(distDir, 'index.html');
        const bricksPath = path.join(distDir, 'bricks.html');
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, bricksPath);
          console.log(`✓ Generated standalone ${bricksPath}`);
        }
      },
    },
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false,
  },
  test: {
    environment: 'node',
  },
});
