import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  // Load all environment variables from standard process.env and .env files
  const env = loadEnv(mode, process.cwd(), '');
  
  const googleMapsKey = 
    env.GOOGLE_MAPS_PLATFORM_KEY ||
    env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const allKeys = Object.keys({...process.env, ...env});
  const mapOrKeyRelated = allKeys.filter(k => k.toLowerCase().includes('map') || k.toLowerCase().includes('key') || k.toLowerCase().includes('google'));
  console.log('--- ALL AVAILABLE MAP/KEY/GOOGLE ENV NAMES:', mapOrKeyRelated);
  console.log('--- DETECTED GOOGLE MAPS PLATFORM KEY:', googleMapsKey ? `FOUND (length: ${googleMapsKey.length}, starts with: ${googleMapsKey.substring(0, 8)})` : 'NOT FOUND');

  return {
    plugins: [react(), tailwindcss()],
    json: {
      stringify: false,
    },
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(googleMapsKey),
      'import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(googleMapsKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
