import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics'

// Loads gtag.js before first paint if VITE_GA_MEASUREMENT_ID is set;
// a silent no-op otherwise (local dev, previews without the key).
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
