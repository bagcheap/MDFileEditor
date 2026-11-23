import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createPlatform } from '@mdedit/platform'
import { App } from './App'
import './styles.css'
import './markdown.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <App platform={createPlatform()} />
  </StrictMode>,
)
