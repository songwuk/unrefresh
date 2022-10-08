import { defineBuildConfig } from 'unbuild'
import image from '@rollup/plugin-image'
export default defineBuildConfig({
  entries: [
    'src/index',
    {
      builder: 'mkdist',
      input: './src/css',
      outDir: './dist/css',
    },
  ],
  declaration: true,
  hooks: {
    'rollup:options': function (_ctx, options) {
      options && options?.plugins!.push(
        // rollup plugin...
        image(),
      )
    },
  },
  clean: true,
  rollup: {
    emitCJS: true,
  },
})
