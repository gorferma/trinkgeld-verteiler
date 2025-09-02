import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Trinkgeld-Verteiler',
        short_name: 'Trinkgeld',
        description: 'Trinkgeld fair verteilen – offlinefähig und teilbar',
        start_url: '/trinkgeld-verteiler/',
        scope: '/trinkgeld-verteiler/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#059669',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ],
      },
    }),
  ],
  // Update base if you rename the GitHub repo
  base: '/trinkgeld-verteiler/',
})
