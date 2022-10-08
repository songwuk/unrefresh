import './style.css'

import Refresh from 'unrefresh'
import 'unrefresh/css'

import typescriptLogo from './typescript.svg'
const body = document.querySelector<HTMLElement>('body')!
const dom = new Refresh(body)
dom.init()
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>refresh-demo</h1>
  </div>
`
