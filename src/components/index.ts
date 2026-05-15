import designloading from './AntDesignLoading.svg'
import type { RefreshAnimationIconPreset } from '../types'

export interface RefreshContainerOptions {
  animation?: string
  animationDuration?: number
  animationIcon?: RefreshAnimationIconPreset
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

const ICONS: Record<Exclude<RefreshAnimationIconPreset, 'auto'>, string> = {
  arc: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M13 32a14 14 0 0 1 19-19" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><path d="M33 10l1 9-8-3" fill="none" stroke="#06b6d4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 9v26" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><path d="M13 25l11 11 11-11" fill="none" stroke="#16a34a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bolt: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M27 4L11 27h11l-2 17 17-25H26z" fill="#2563eb"/><path d="M27 4L11 27h11l-2 17 17-25H26z" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linejoin="round"/></svg>',
  diamond: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l17 19-17 19L7 24z" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/><path d="M14 24h20M24 5v38" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/></svg>',
  dot: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="#2563eb" opacity=".18"/><circle cx="24" cy="24" r="7" fill="#2563eb"/><circle cx="33" cy="15" r="4" fill="#06b6d4"/></svg>',
  loop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M37 24a13 13 0 1 1-4-9" fill="none" stroke="#172033" stroke-width="5" stroke-linecap="round"/><path d="M34 7v9h-9" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  magnet: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M14 8v17a10 10 0 0 0 20 0V8" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><path d="M14 8h8M26 8h8M14 18h8M26 18h8" fill="none" stroke="#06b6d4" stroke-width="4" stroke-linecap="round"/></svg>',
  orbit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7" fill="#172033"/><ellipse cx="24" cy="24" rx="18" ry="10" fill="none" stroke="#2563eb" stroke-width="3"/><circle cx="39" cy="24" r="4" fill="#06b6d4"/></svg>',
  spark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l4 14 14 5-14 5-4 14-5-14-14-5 14-5z" fill="#2563eb"/><path d="M36 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#06b6d4"/></svg>',
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function getAutoIcon(animation?: string): Exclude<RefreshAnimationIconPreset, 'auto'> {
  if (animation === 'bounce')
    return 'arrow'

  if (animation === 'flip')
    return 'diamond'

  if (animation === 'magnetic')
    return 'magnet'

  if (animation === 'none')
    return 'dot'

  if (animation === 'orbit')
    return 'orbit'

  if (animation === 'pulse')
    return 'dot'

  if (animation === 'spin')
    return 'loop'

  return 'spark'
}

export function getRefreshAnimationIcon(
  animation?: string,
  icon: RefreshAnimationIconPreset = 'auto',
) {
  const iconName = icon === 'auto'
    ? getAutoIcon(animation)
    : icon

  return svgToDataUri(ICONS[iconName])
}

export function createRefreshContainer(options: RefreshContainerOptions = {}): RefreshContainerElements {
  const container = document.createElement('div')
  container.className = ['refresh-container', options.containerClassName].filter(Boolean).join(' ')
  container.setAttribute('aria-atomic', 'true')
  container.setAttribute('aria-live', options.ariaLive || 'polite')
  container.dataset.animation = options.animation || 'spin'
  container.dataset.icon = options.animationIcon || 'auto'

  if (typeof options.animationDuration === 'number' && options.animationDuration >= 0)
    container.style.setProperty('--unrefresh-animation-duration', `${options.animationDuration}ms`)

  if (options.ariaLive !== 'off')
    container.setAttribute('role', 'status')

  const top = document.createElement('div')
  top.className = 'refresh-top'
  top.setAttribute('aria-hidden', 'true')

  const spinner = document.createElement('img')
  spinner.src = options.loadingImage || getRefreshAnimationIcon(options.animation, options.animationIcon)
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
