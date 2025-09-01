import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Update base if you rename the GitHub repo
  base: '/trinkgeld-verteiler/',
})
