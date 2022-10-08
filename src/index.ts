import { RefreshContainer } from './components/index'
import { reactive } from './reactive'
import type { opts } from './types'
const reactiveObj = reactive({
  _lineText: '下拉刷新',
})

class Refresh {
  private _dom: HTMLElement
  private _startY: number
  private _currenty: number
  private _isLoading: boolean
  private _pullDownLength: number
  private _opts: opts
  constructor(dom?: HTMLElement, pullDownLength?: number) {
    this._dom = dom || document.documentElement || document
    this._opts = {
      designloading: '',
    }
    this._pullDownLength = pullDownLength || 80
    this._isLoading = false
    this._startY = 0
    this._currenty = 0
  }

  init(opts: Record<string, any> = {}) {
    const body = document.querySelector('body')
    body?.appendChild(RefreshContainer)
    body?.insertBefore(RefreshContainer, body.childNodes[0])
    const lineTextHTML = document.querySelector('#text')
    if (lineTextHTML)
      lineTextHTML.textContent = reactiveObj._lineText
    this._opts = opts
    this._dom.addEventListener('touchstart', (ev: TouchEvent) => this._unOnTouchStart(ev))
    this._dom.addEventListener('touchmove', (ev: TouchEvent) => this._unOnTouchMove(ev))
    this._dom.addEventListener('touchend', async () => await this._unOnTouchend())
  }

  private _unOnTouchStart(ev: TouchEvent) {
    reactiveObj._lineText = '下拉刷新'
    if (!this._isLoading) {
      const touch = ev.targetTouches[0]
      this._startY = touch.screenY
    }
  }

  private _loadInit() {
    const childNode = Array.from(RefreshContainer.childNodes) as Array<HTMLElement>
    childNode[0]?.classList.add('load-init')
    this._isLoading = true
  }

  private _unOnTouchMove(ev: TouchEvent) {
    if (!this._isLoading) {
      const touch = ev.targetTouches[0]
      this._currenty = touch.screenY
      const changeY = this._currenty - this._startY > 0 ? Math.abs(this._currenty - this._startY) : 0
      if (changeY <= this._pullDownLength)
        RefreshContainer.style.marginTop = `${changeY}px`
      if (RefreshContainer.hasChildNodes()) {
        const children = Array.from(RefreshContainer.childNodes) as Array<HTMLElement>
        this._rotate(children[0].children[0] as any, changeY * 9)
      }
      if (changeY >= this._pullDownLength) {
        reactiveObj._lineText = '释放刷新'
        return this._loadInit()
      }
    }
  }

  private async _unOnTouchend() {
    const children = Array.from(RefreshContainer.childNodes) as Array<HTMLElement>
    const changeY = this._currenty - this._startY
    if (changeY <= this._pullDownLength) {
      reactiveObj._lineText = '下拉刷新'
      this._isLoading = false
      RefreshContainer.style.marginTop = '-75px'
      children[0].classList.remove('load-init')
      children[0].classList.remove('load-start')
    }
    if (this._isLoading) {
      reactiveObj._lineText = '加载中'
      children[0].classList.add('load-start')
      setTimeout(() => {
        reactiveObj._lineText = '下拉刷新'
        this._isLoading = false
        RefreshContainer.style.marginTop = '-75px'
        children[0].classList.remove('load-init')
        children[0].classList.remove('load-start')
      }, 1000)
    }
    if (RefreshContainer.hasChildNodes())
      this._rotate(children[0].children[0] as any, 0)
  }

  private _rotate(dom: HTMLElement, rotate: number) {
    dom.style.transform = `rotate(${rotate}deg)`
  }
}
export default Refresh
