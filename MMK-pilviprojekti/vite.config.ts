import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/meeamkcloud/MMK-pilviprojekti/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        viikko3: 'viikko3.html',
        viikko4: 'viikko4.html',
        viikko5: 'viikko5.html',
      },
    },
  },
})
