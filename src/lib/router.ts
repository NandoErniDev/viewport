import { useEffect, useState } from 'react'

const ROUTE_EVENT = 'viewport:route'

export function go(path: string): void {
  if (`${window.location.pathname}${window.location.search}` === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event(ROUTE_EVENT))
  window.scrollTo({ top: 0 })
}

export function replacePath(path: string): void {
  window.history.replaceState({}, '', path)
}

export function useRoute(): string {
  const [route, setRoute] = useState(() => window.location.pathname)
  useEffect(() => {
    const update = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener(ROUTE_EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(ROUTE_EVENT, update)
    }
  }, [])
  return route
}
