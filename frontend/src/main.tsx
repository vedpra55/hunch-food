import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/mukta/400.css'
import '@fontsource/mukta/600.css'
import './styles/index.css'

import { IconContext } from '@phosphor-icons/react'
import { MotionConfig } from 'motion/react'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LIVE } from './live/api'
import { LiveHome } from './live/LiveHome'
import { Home } from './pages/Home'
import { Landing } from './pages/Landing'
import { Playground } from './pages/Playground'

export function Root() {
  const isPlayground = location.pathname.startsWith('/playground')
  const initialApp = location.search.includes('app') || location.pathname.startsWith('/app')
  const [showApp, setShowApp] = useState(initialApp)

  useEffect(() => {
    const onPop = () => setShowApp(location.search.includes('app') || location.pathname.startsWith('/app'))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const startApp = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('app', '1')
    window.history.pushState({}, '', url.toString())
    setShowApp(true)
  }

  if (isPlayground) return <Playground />

  if (showApp) {
    const AppView = LIVE ? LiveHome : Home
    return <AppView />
  }

  return <Landing onStartApp={startApp} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ size: 20, weight: 'regular' }}>
        <Root />
      </IconContext.Provider>
    </MotionConfig>
  </StrictMode>,
)
