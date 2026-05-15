import designloading from './AntDesignLoading.svg'

export interface RefreshContainerOptions {
  ariaLive?: 'assertive' | 'off' | 'polite'
  containerClassName?: string
  loadingImage?: string
  text?: string
}

export interface RefreshContainerElements {
  container: HTMLDivElement
  spinner: HTMLImageElement
  text: HTMLSpanElement
  top: HTMLDivElement
}

export function createRefreshContainer(options: RefreshContainerOptions = {}): RefreshContainerElements {
  const container = document.createElement('div')
  container.className = ['refresh-container', options.containerClassName].filter(Boolean).join(' ')
  container.setAttribute('aria-atomic', 'true')
  container.setAttribute('aria-live', options.ariaLive || 'polite')

  if (options.ariaLive !== 'off')
    container.setAttribute('role', 'status')

  const top = document.createElement('div')
  top.className = 'refresh-top'
  top.setAttribute('aria-hidden', 'true')

  const spinner = document.createElement('img')
  spinner.src = options.loadingImage || designloading
  spinner.className = 'spinner'
  spinner.alt = ''

  const text = document.createElement('span')
  text.className = 'refresh-text'
  text.textContent = options.text || ''

  top.appendChild(spinner)
  container.append(top, text)

  return {
    container,
    spinner,
    text,
    top,
  }
}

export { designloading as defaultLoadingIcon }
