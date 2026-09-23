import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on a custom domain or a /repo/ subpath.
export default defineConfig({
  plugins: [react()],
  base: './',
});
