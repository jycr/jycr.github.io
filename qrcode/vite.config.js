import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sender: resolve(__dirname, 'sender.html'),
        receiver: resolve(__dirname, 'receiver.html'),
      },
    },
  },
})
