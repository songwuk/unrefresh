import image from '@rollup/plugin-image'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/vanilla',
    'src/vue',
    'src/react',
    {
      builder: 'mkdist',
      input: './src/css',
      outDir: './dist/css',
    },
  ],
  declaration: true,
  hooks: {
    'rollup:options': function (_ctx, options) {
      const outputs = Array.isArray(options.output) ? options.output : [options.output]
      outputs.forEach((output) => {
        if (output?.format === 'cjs')
          output.exports = 'named'
      })
      options.plugins?.push(image())
    },
  },
  clean: true,
  rollup: {
    emitCJS: true,
  },
})
