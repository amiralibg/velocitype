import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // drei/fiber must share the app's single three.js instance
    dedupe: ['three', '@react-three/fiber'],
  },
});
