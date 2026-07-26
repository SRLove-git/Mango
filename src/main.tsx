import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import ClickEffect from './components/ClickEffect'
import SakuraEffect from './components/SakuraEffect'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClickEffect />
      <SakuraEffect />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
