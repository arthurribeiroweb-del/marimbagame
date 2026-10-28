import { defineConfig } from 'vite';

// base relativa: o mesmo build funciona em qualquer subcaminho (GitHub Pages: /nome-do-repo/)
export default defineConfig({ base: './' });
