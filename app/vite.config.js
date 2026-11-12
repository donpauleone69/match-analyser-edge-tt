import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Path aliases
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        hmr: {
            overlay: false, // Disable overlay to prevent refresh loops on mobile
        },
    },
    // Exclude FFmpeg from pre-bundling
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],
    },
    // Build optimizations for mobile
    build: {
        target: 'es2015',
        minify: 'esbuild',
    },
});
