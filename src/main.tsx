import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

declare const __STATIC_DEPLOY__: boolean

if (__STATIC_DEPLOY__) {
  document.documentElement.classList.add('static-deploy')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
