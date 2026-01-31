import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../node_modules/classicy/dist/classicy.css'
import { ClassicyDesktop, ClassicyAppManagerProvider } from 'classicy'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClassicyAppManagerProvider>
      <ClassicyDesktop>
      </ClassicyDesktop>
    </ClassicyAppManagerProvider>
  </StrictMode>,
)
