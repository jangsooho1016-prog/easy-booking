import { useEffect, useId, useRef, useState } from 'react'
import { speak, speechSupported } from '../lib/speech'
import { FONT_SCALES, useSettings } from '../state/settings'
import { BigButton } from './BigButton'
import { ButtonStack } from './ButtonStack'

const toolButton =
  'flex min-h-button flex-col items-center justify-center rounded-button border-[3px] border-primary px-3 ' +
  'text-button leading-[1.52] font-semibold active:translate-y-px'

/**
 * 화면 우측 상단 도구 (PRD 4.3). 두 버튼 모두 글자 라벨과 지금 상태를 글자로 보여 준다.
 * - 소리로 듣기 (FR-30): 켜면 화면이 바뀔 때마다 질문을 읽는다. 지원하지 않으면 숨긴다.
 * - 글씨 크기 (FR-31): 누르면 바로 아래에 [보통]/[크게]/[아주 크게]가 열린다.
 */
export function ScreenTools() {
  const { tts, setTts, fontScale, setFontScale } = useSettings()
  const [open, setOpen] = useState(false)
  const fontButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const current = FONT_SCALES.find((s) => s.value === fontScale)!

  // 열리면 고른 것(없으면 첫 선택지)으로 초점을 옮기고, Esc로 닫는다
  useEffect(() => {
    if (!open) return
    const target = panel.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]') ??
      panel.current?.querySelector<HTMLButtonElement>('button')
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        fontButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggleTts = () => {
    const next = !tts
    setTts(next)
    // 켜자마자 지금 화면의 질문을 읽어 켜졌다는 것을 바로 알 수 있게 한다
    if (next) speak(document.querySelector('h1')?.textContent ?? '')
  }

  const choose = (value: (typeof FONT_SCALES)[number]['value']) => {
    setFontScale(value)
    setOpen(false)
    fontButton.current?.focus()
  }

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        {speechSupported() && (
          <button
            type="button"
            onClick={toggleTts}
            aria-pressed={tts}
            className={`${toolButton} ${tts ? 'bg-primary text-surface' : 'bg-surface text-primary'}`}
          >
            <span>소리로 듣기</span>
            <span className="text-body leading-[1.52] font-normal">{tts ? '켜짐' : '꺼짐'}</span>
          </button>
        )}
        <button
          ref={fontButton}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`${toolButton} bg-surface text-primary`}
        >
          <span>글씨 크기</span>
          <span className="text-body leading-[1.52] font-normal">{current.label}</span>
        </button>
      </div>

      {open && (
        <div
          ref={panel}
          id={panelId}
          className="mt-3 rounded-button border-[3px] border-primary bg-surface p-4"
        >
          <p className="mb-3 text-body font-bold text-ink">글씨 크기를 골라 주세요.</p>
          <ButtonStack label="글씨 크기">
            {FONT_SCALES.map((s) => (
              <BigButton
                key={s.value}
                variant="secondary"
                selected={s.value === fontScale}
                onClick={() => choose(s.value)}
              >
                {s.label}
              </BigButton>
            ))}
          </ButtonStack>
        </div>
      )}
    </div>
  )
}
