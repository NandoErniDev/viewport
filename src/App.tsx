import { useEffect } from 'react'
import { Landing } from './pages/Landing'
import { Workspace } from './pages/Workspace'
import { useRoute } from './lib/router'

export default function App() {
  const route = useRoute()
  const isWorkspace = route.startsWith('/workspace')

  useEffect(() => {
    document.title = isWorkspace
      ? 'Workspace — VIEWPORT'
      : 'VIEWPORT — Every screen. One view.'
  }, [isWorkspace])

  return isWorkspace ? <Workspace /> : <Landing />
}
