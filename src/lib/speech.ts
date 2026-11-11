/**
 * 화면 문장을 한국어로 읽어 준다 (FR-30). Web Speech API의 SpeechSynthesis.
 * 지원하지 않는 브라우저에서는 아무것도 하지 않고, "소리로 듣기" 버튼도 숨긴다.
 */

export const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

let koreanVoice: SpeechSynthesisVoice | null = null

function pickVoice() {
  if (!speechSupported()) return
  const voices = window.speechSynthesis.getVoices()
  koreanVoice = voices.find((v) => v.lang === 'ko-KR') ?? voices.find((v) => v.lang.startsWith('ko')) ?? null
}

if (speechSupported()) {
  pickVoice()
  // 목소리 목록은 늦게 도착하는 브라우저가 많다
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

/** 읽던 것을 멈추고 새 문장을 읽는다 */
export function speak(text: string) {
  if (!speechSupported()) return
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = 'ko-KR'
  utterance.rate = 0.9 // 조금 천천히
  if (koreanVoice) utterance.voice = koreanVoice
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** 지금 읽어 주는 중인지 (읽는 소리가 끝난 뒤에 듣기 시작하려고 쓴다) */
export const isSpeaking = () =>
  speechSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
