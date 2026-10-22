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
import { installBackLayers } from './utils/backLayers'
import { installStorageLifecycle } from './storage/lifecycle'

// Before anything touches IndexedDB: out of view or frozen, this window starts
// no transactions and finishes the open ones, so it never holds the storage
// for another ASCEND (storage/lifecycle.ts).
installStorageLifecycle()

// Looking for (and applying) a new version does not wait for the app to boot.
startServiceWorkerUpdates()

// The back button closes sheets before it leaves a page. Listens before the
// router does, so it has to be installed before the first render.
installBackLayers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
