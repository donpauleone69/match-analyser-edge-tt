import { installTestSpeed } from './testSpeed'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { bootMatches } from '@/stores/matchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import './index.css'

installTestSpeed(useSettingsStore.getState().testSpeed)

await bootMatches()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
