import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/ibm-plex-sans-kr/700.css'
import './styles/index.css'
import { App } from './App'
import { initNowOverride } from './lib/time'
import { applyFontScale, loadSettings } from './state/settings'

// 시험용: ?now=17:40 으로 현재 시각을 바꿔 볼 수 있다 (FR-11 확인용)
initNowOverride()
// 저장된 글씨 크기를 첫 화면을 그리기 전에 적용한다 (FR-31)
applyFontScale(loadSettings().fontScale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
