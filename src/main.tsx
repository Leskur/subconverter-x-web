import { /* StrictMode, */ useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }, [])
  return null
}

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <>
    <ThemeInit />
    <App />
    <Toaster richColors position="top-right" />
  </>
  // </StrictMode>
)
