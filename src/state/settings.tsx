import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { speak, speechSupported, stopSpeaking } from '../lib/speech'
import { load, save } from '../lib/storage'

/** 글씨 크기 3단계 (FR-31). 값은 <html data-font-scale>에 그대로 들어간다 */
export const FONT_SCALES = [
  { value: 'normal', label: '보통' },
  { value: 'large', label: '크게' },
  { value: 'xlarge', label: '아주 크게' },
] as const
export type FontScale = (typeof FONT_SCALES)[number]['value']

type Settings = { fontScale: FontScale; tts: boolean }

const SETTINGS_KEY = 'settings'
const DEFAULTS: Settings = { fontScale: 'normal', tts: false }

export function loadSettings(): Settings {
  const raw = load<Partial<Settings> | null>(SETTINGS_KEY, null)
  const fontScale = FONT_SCALES.some((s) => s.value === raw?.fontScale) ? raw!.fontScale! : DEFAULTS.fontScale
  return { fontScale, tts: raw?.tts === true && speechSupported() }
}

/** 첫 화면을 그리기 전에 글씨 크기를 맞춰 깜빡임을 없앤다 (main.tsx에서 호출) */
export function applyFontScale(scale: FontScale) {
  document.documentElement.dataset.fontScale = scale
}

type SettingsContextValue = Settings & {
  setFontScale: (scale: FontScale) => void
  setTts: (on: boolean) => void
  /** 소리로 듣기가 켜져 있을 때만 읽는다 */
  say: (text: string) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    applyFontScale(settings.fontScale)
    save(SETTINGS_KEY, settings)
  }, [settings])

  const setFontScale = useCallback((fontScale: FontScale) => setSettings((s) => ({ ...s, fontScale })), [])
  const setTts = useCallback((tts: boolean) => {
    if (!tts) stopSpeaking()
    setSettings((s) => ({ ...s, tts }))
  }, [])
  const say = useCallback((text: string) => settings.tts && speak(text), [settings.tts])

  const value = useMemo(
    () => ({ ...settings, setFontScale, setTts, say }),
    [settings, setFontScale, setTts, say],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings는 SettingsProvider 안에서만 쓸 수 있어요')
  return ctx
}
