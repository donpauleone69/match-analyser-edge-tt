import { installTestSpeed } from './testSpeed'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { DemoProvider } from '@/data/demoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import './index.css'

installTestSpeed(useSettingsStore.getState().testSpeed)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DemoProvider>
          <App />
        </DemoProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
