import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts ship with the app (latin only): no wait on Google Fonts before the
// first paint, and they work offline.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/marcellus/latin-400.css'
import './index.css'
import App from './App.tsx'
import { startServiceWorkerUpdates } from './utils/swUpdate'

// Looking for (and applying) a new version does not wait for the app to boot.
startServiceWorkerUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
