const hasOwnProperty = Object.prototype.hasOwnProperty
const hasOwn = (obj: object, key: string | symbol) => hasOwnProperty.call(obj, key)
export const reactiveWeakMap = new WeakMap()
const reactive = (obj: object) => {
  return createReactiveObject(
    obj,
    reactiveWeakMap,
  )
}
const effect = (_lineText: string) => {
  const text = document.querySelector('#text')
  if (text)
    text.innerHTML = _lineText
}
function createReactiveObject(obj: object, proxyMap: WeakMap<object, any>) {
  const existingProxy = proxyMap.get(obj)
  if (existingProxy)
    return existingProxy
  const proxy = new Proxy(obj, {
    set: (target: Record<string, any>, props: string, value, receiver) => {
      target[props] = value
      effect(target[props])
      return Reflect.set(target, props, value, receiver)
    },
    get: (target: Record<string, any>, props: string, receiver) => {
      return Reflect.get(
        hasOwn(target, props) && props in target ? target : {},
        props,
        receiver)
    },
  })
  proxyMap.set(obj, proxy)
  return proxy
}
export {
  reactive,
}
