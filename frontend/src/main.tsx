import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/mukta/400.css'
import '@fontsource/mukta/600.css'
import './styles/index.css'

import { IconContext } from '@phosphor-icons/react'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LIVE } from './live/api'
import { LiveHome } from './live/LiveHome'
import { Home } from './pages/Home'
import { Playground } from './pages/Playground'

// Live (real agent, VITE_API_URL set) or the offline demo (?demo, or no API configured).
const Page = location.pathname.startsWith('/playground') ? Playground : LIVE ? LiveHome : Home

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ size: 20, weight: 'regular' }}>
        <Page />
      </IconContext.Provider>
    </MotionConfig>
  </StrictMode>,
)
