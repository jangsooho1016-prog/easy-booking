import { useEffect, useRef, useState } from 'react'
import { listenOnce, listenSupported, setVoiceMode, voiceModeOn } from '../lib/listen'
import { isSpeaking, stopSpeaking } from '../lib/speech'
import { matchYesNo } from '../lib/voiceMatch'
import { useSettings } from '../state/settings'

export const NOT_UNDERSTOOD = '잘 못 들었어요. 다시 말씀하시거나 버튼을 눌러 주세요.'
const MIC_BLOCKED = '마이크를 쓸 수 없어요. 버튼을 눌러 주세요.'
const UNAVAILABLE = '이 브라우저에서는 말로 대답할 수 없어요. 버튼을 눌러 주세요.'
const LISTENING = '듣고 있어요. 말씀해 주세요.'

/** 듣기가 이보다 빨리 결과 없이 끝나면 "제대로 듣지 못한 것"으로 센다 */
const QUICK_END_MS = 1000

type VoiceAnswerProps = {
  /**
   * 알아들은 말(후보 여러 개)을 받아 처리한다.
   * 답으로 쓸 수 없으면 사용자에게 보여 줄 안내 문장을 돌려준다.
   */
  onHeard: (texts: string[]) => string | void
}

/** idle = 안 듣는 중, waiting = 읽어 주는 소리가 끝나기를 기다리는 중, listening = 듣는 중 */
type Phase = 'idle' | 'waiting' | 'listening'

/**
 * [말로 대답하기] (FR-33). 알아들은 답은 버튼을 누른 것과 똑같이 처리한다.
 * 한 번 누르면 "계속 듣기"가 켜져, 말로 대답할 수 있는 화면에서는 다시 누르지 않아도 듣는다.
 * 화면은 사용자가 답했을 때만 넘어간다. 아무 말이 없으면 그 화면에서 계속 듣는다.
 * 음성 인식을 지원하지 않는 브라우저에서는 아무것도 그리지 않는다.
 */
export function VoiceAnswer({ onHeard }: VoiceAnswerProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  /** 결과 없이 금방 끝난 횟수(연속). 두 번이면 계속 듣기를 끈다 */
  const quickEnds = useRef(0)
  const onHeardRef = useRef(onHeard)
  onHeardRef.current = onHeard
  const { say } = useSettings()
  const sayRef = useRef(say)
  sayRef.current = say

  /** 기다리던 것과 듣던 것을 모두 조용히 멈춘다 */
  const cancel = () => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    stopRef.current?.()
    stopRef.current = null
  }

  const show = (text: string) => {
    setMessage(text)
    sayRef.current(text)
  }

  const listen = () => {
    const startedAt = Date.now()
    setPhase('listening')
    stopRef.current = listenOnce({
      onHeard: (texts) => {
        stopRef.current = null
        quickEnds.current = 0
        const problem = onHeardRef.current(texts)
        if (!problem) {
          setPhase('idle')
          return
        }
        // 답으로 쓸 수 없는 말: 안내를 보여 주고, 계속 듣기 중이면 다시 듣는다
        show(problem)
        if (voiceModeOn()) listenWhenQuiet()
        else setPhase('idle')
      },
      onFail: (reason) => {
        stopRef.current = null
        if (reason === 'denied' || reason === 'unavailable') {
          setPhase('idle')
          show(reason === 'denied' ? MIC_BLOCKED : UNAVAILABLE)
          return
        }
        // 아무 말이 없어 브라우저가 듣기를 끝낸 경우: 안내 없이 조용히 다시 듣는다.
        // 다만 금방 끝나기를 되풀이하면 멈추고 버튼으로 안내한다.
        quickEnds.current = Date.now() - startedAt < QUICK_END_MS ? quickEnds.current + 1 : 0
        if (voiceModeOn() && quickEnds.current < 2) {
          listenWhenQuiet()
          return
        }
        setVoiceMode(false)
        setPhase('idle')
        show(NOT_UNDERSTOOD)
      },
    })
  }

  /** 읽어 주는 소리가 마이크로 들어가 답으로 들리지 않게, 소리가 끝난 뒤에 듣는다 */
  function listenWhenQuiet() {
    setPhase('waiting')
    const tick = () => {
      if (isSpeaking()) {
        timerRef.current = window.setTimeout(tick, 250)
      } else {
        timerRef.current = undefined
        listen()
      }
    }
    // 화면이 바뀐 직후에는 질문 읽기가 아직 시작되지 않았을 수 있어 잠깐 기다린다
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(tick, 300)
  }

  // 계속 듣기가 켜져 있으면 화면에 들어오자마자 듣는다.
  // 탭이 가려지면 멈추고, 다시 보이면 이어서 듣는다. 화면을 떠나면 그만 듣는다.
  useEffect(() => {
    if (voiceModeOn()) listenWhenQuiet()
    const onVisibility = () => {
      cancel()
      if (!document.hidden && voiceModeOn()) listenWhenQuiet()
      else setPhase('idle')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      cancel()
    }
    // 처음 한 번만. 안에서 쓰는 함수들은 ref와 setState만 건드린다
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 처음부터 지원하지 않으면 아무것도 그리지 않는다.
  // 써 보니 안 되는 브라우저였다면 안내 문장만 남기고 버튼을 숨긴다.
  const supported = listenSupported()
  if (!supported && !message) return null

  const start = () => {
    setVoiceMode(true)
    quickEnds.current = 0
    cancel()
    stopSpeaking() // 읽어 주던 소리가 마이크로 들어가지 않게 한다
    setMessage(null)
    listen()
  }

  const stop = () => {
    setVoiceMode(false)
    cancel()
    setPhase('idle')
  }

  const active = phase !== 'idle'
  const statusText = message ?? (phase === 'listening' ? LISTENING : null)

  // 아래 고정 영역에 놓인다(ScreenLayout의 voice). 안내 문장은 버튼 위로 늘어나므로
  // 문장이 생기거나 길어져도 버튼 자리는 움직이지 않는다.
  return (
    <div>
      <p role="status" className={statusText ? 'mb-2 text-body font-bold text-ink' : 'sr-only'}>
        {statusText}
      </p>
      {supported && (
        <button
          type="button"
          onClick={active ? stop : start}
          className={
            'flex w-full min-h-button items-center justify-center gap-2 rounded-button px-5 py-3 ' +
            'border-[3px] border-ink-muted bg-surface text-button font-semibold text-ink active:bg-canvas'
          }
        >
          {!active && (
            <svg viewBox="0 0 24 24" className="size-[1.2em] shrink-0" aria-hidden="true" fill="currentColor">
              <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm7-4a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
            </svg>
          )}
          {active ? '그만 들을게요' : '말로 대답하기'}
        </button>
      )}
    </div>
  )
}

/** 예/아니요 질문용: "네", "맞아요" → onYes / "아니요", "다시 고를게요" → onNo */
export function VoiceYesNo({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <VoiceAnswer
      onHeard={(texts) => {
        const answer = matchYesNo(texts)
        if (answer === 'yes') onYes()
        else if (answer === 'no') onNo()
        else return NOT_UNDERSTOOD
      }}
    />
  )
}
