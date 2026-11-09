import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' para que el build funcione en GitHub Pages o abierto desde cualquier carpeta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
