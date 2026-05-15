import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'unrefresh/css',
        replacement: resolve(__dirname, '../src/css/container.css'),
      },
      {
        find: 'unrefresh/vanilla',
        replacement: resolve(__dirname, '../src/vanilla.ts'),
      },
      {
        find: 'unrefresh/resource',
        replacement: resolve(__dirname, '../src/resource.ts'),
      },
      {
        find: 'unrefresh',
        replacement: resolve(__dirname, '../src/index.ts'),
      },
    ],
  },
})
