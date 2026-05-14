import designloading from './AntDesignLoading.svg'

export interface RefreshContainerOptions {
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

  const top = document.createElement('div')
  top.className = 'refresh-top'

  const spinner = document.createElement('img')
  spinner.src = options.loadingImage || designloading
  spinner.className = 'spinner'
  spinner.alt = 'loading'

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
