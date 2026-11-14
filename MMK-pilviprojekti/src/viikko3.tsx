import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppViikko3 from './AppViikko3'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppViikko3 />
  </StrictMode>,
)
