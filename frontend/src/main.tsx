import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/mukta/400.css'
import '@fontsource/mukta/600.css'
import './styles/index.css'

import { IconContext } from '@phosphor-icons/react'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Home } from './pages/Home'
import { Playground } from './pages/Playground'

// Two pages for now; a router comes with the real screens.
const Page = location.pathname.startsWith('/playground') ? Playground : Home

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ size: 20, weight: 'regular' }}>
        <Page />
      </IconContext.Provider>
    </MotionConfig>
  </StrictMode>,
)
