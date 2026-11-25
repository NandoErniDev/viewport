import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/base.css'
import './styles/workspace.css'
import './styles/utilities.css'
import './styles/landing.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element missing')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
