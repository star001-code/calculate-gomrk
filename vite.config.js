import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/calculate-gomrk/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
