/**
 * 말로 대답하기 (FR-33). Web Speech API의 SpeechRecognition으로 한 마디를 듣는다.
 * 지원하지 않는 브라우저에서는 [말로 대답하기] 버튼을 숨긴다.
 */

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}

function recognitionClass(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as Record<string, new () => Recognition>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/**
 * 음성 인식이 있다고 알려 주지만 실제로는 동작하지 않는 브라우저가 있다
 * (인식 서버에 연결하지 못해 누르자마자 network 오류로 끝난다).
 * 한 번 그렇게 끝나면 이 브라우저는 지원하지 않는 것으로 보고 버튼을 숨긴다.
 */
let broken = false

export const listenSupported = () => !broken && !!recognitionClass()

/**
 * 계속 듣기: [말로 대답하기]를 한 번 누르면 켜지고, 말로 대답할 수 있는 화면마다
 * 다시 누르지 않아도 듣는다. [그만 들을게요]를 누르거나 마이크를 쓸 수 없으면 꺼진다.
 * 저장하지 않으므로 새로고침하면 꺼진다.
 */
let voiceMode = false

export const voiceModeOn = () => voiceMode && listenSupported()
export const setVoiceMode = (on: boolean) => {
  voiceMode = on
}

/**
 * denied = 마이크를 쓸 수 없음
 * unavailable = 이 브라우저에서는 음성 인식을 쓸 수 없음
 * unheard = 아무 말도 알아듣지 못함
 * stopped = 브라우저가 듣기를 그만둠 (안내할 것 없음)
 */
export type ListenFailure = 'denied' | 'unavailable' | 'unheard' | 'stopped'

function failureOf(error: string): ListenFailure {
  if (error === 'not-allowed' || error === 'audio-capture') return 'denied'
  if (error === 'network' || error === 'service-not-allowed' || error === 'language-not-supported') return 'unavailable'
  if (error === 'aborted') return 'stopped'
  return 'unheard'
}

type ListenHandlers = {
  /** 알아들은 말. 가능성이 높은 순서로 여러 후보가 온다 */
  onHeard: (texts: string[]) => void
  onFail: (reason: ListenFailure) => void
}

/** 한 마디를 듣는다. 돌려주는 함수를 부르면 조용히 그만 듣는다 */
export function listenOnce({ onHeard, onFail }: ListenHandlers): () => void {
  const Rec = recognitionClass()
  if (!Rec) {
    onFail('denied')
    return () => {}
  }

  let finished = false
  const finish = (report: () => void) => {
    if (finished) return
    finished = true
    report()
  }

  const rec = new Rec()
  rec.lang = 'ko-KR'
  rec.continuous = false
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.onresult = (event) => {
    const texts = Array.from(event.results[0] ?? [])
      .map((alt) => alt.transcript.trim())
      .filter(Boolean)
    finish(() => (texts.length > 0 ? onHeard(texts) : onFail('unheard')))
  }
  rec.onerror = (event) => {
    const reason = failureOf(event.error)
    if (reason === 'unavailable') broken = true
    if (reason === 'unavailable' || reason === 'denied') voiceMode = false
    finish(() => onFail(reason))
  }
  rec.onend = () => finish(() => onFail('unheard'))

  try {
    rec.start()
  } catch {
    finish(() => onFail('unheard'))
  }

  return () => {
    finished = true
    try {
      rec.abort()
    } catch {
      // 이미 끝났으면 무시
    }
  }
}
