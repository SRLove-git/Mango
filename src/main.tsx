import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.tsx'
import ClickEffect from './components/ClickEffect'
import SakuraEffect from './components/SakuraEffect'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ClickEffect />
        <SakuraEffect />
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
