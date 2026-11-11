/**
 * 알아들은 말을 화면의 답으로 바꾼다 (FR-33). 모두 순수 함수.
 * 음성 인식은 후보를 여러 개 주므로, 앞에서부터 처음 맞는 것을 쓴다.
 */
import { parseSlot, type Slot } from './time'

const squash = (text: string) => text.replace(/[\s.,!?~]/g, '')

/* ───────────── 예 / 아니요 ───────────── */

// "다른 병원으로 할게요", "다시 고를게요"처럼 아니요 쪽 버튼 문구도 받아 준다
const NO_WORDS = ['아니', '아뇨', '다시', '다른', '싫', '말고', '바꿔', '바꿀', '고를']
const YES_STARTS = /^(네|예|응|어)/
const YES_WORDS = ['맞아', '맞습', '그래', '좋아', '할게', '해주', '해줘', '빨리']

export function matchYesNo(texts: string[]): 'yes' | 'no' | null {
  for (const raw of texts) {
    const text = squash(raw)
    if (!text) continue
    // "아니요, 다른 병원으로 할게요"에도 "할게"가 들어 있으므로 아니요를 먼저 본다
    if (NO_WORDS.some((w) => text.includes(w))) return 'no'
    if (YES_STARTS.test(text) || YES_WORDS.some((w) => text.includes(w))) return 'yes'
  }
  return null
}

/* ───────────── 시간 ───────────── */

const HOUR_WORDS: Record<string, number> = {
  열두: 12,
  열한: 11,
  열: 10,
  아홉: 9,
  여덟: 8,
  일곱: 7,
  여섯: 6,
  다섯: 5,
  네: 4,
  세: 3,
  두: 2,
  한: 1,
}
// 긴 말부터 견주어야 "열두 시"가 "두 시"로 읽히지 않는다
const HOUR_PATTERN = new RegExp(`(\\d{1,2}|${Object.keys(HOUR_WORDS).join('|')})시`)

type SpokenTime = { period: 'am' | 'pm' | null; hour: number; minute: number }

/** "오후 두 시 반", "2시 30분", "14:30" → 시·분. 시간으로 읽을 수 없으면 null */
export function parseSpokenTime(raw: string): SpokenTime | null {
  const text = squash(raw)
  const period = /오전|아침/.test(text) ? 'am' : /오후|저녁|낮/.test(text) ? 'pm' : null

  const clock = text.match(/(\d{1,2}):(\d{2})/)
  if (clock) return { period, hour: Number(clock[1]), minute: Number(clock[2]) }

  const found = text.match(HOUR_PATTERN)
  if (!found) return null
  const hour = /^\d/.test(found[1]) ? Number(found[1]) : HOUR_WORDS[found[1]]

  const rest = text.slice(found.index! + found[0].length)
  let minute = 0
  const digits = rest.match(/^(\d{1,2})분/)
  if (digits) minute = Number(digits[1])
  else if (/^(반|삼십분)/.test(rest)) minute = 30

  if (hour > 23 || minute > 59) return null
  return { period, hour, minute }
}

/**
 * 말한 시간을 지금 예약할 수 있는 시간과 맞춰 본다.
 * 오전/오후를 말하지 않으면 둘 다 견주어, 열려 있는 시간이 하나뿐일 때만 고른다.
 * 'closed' = 시간은 알아들었지만 그 시간에 예약할 수 없음
 */
export function matchTime(texts: string[], slots: Slot[]): Slot | 'closed' | null {
  let understood = false
  for (const raw of texts) {
    const spoken = parseSpokenTime(raw)
    if (!spoken) continue
    understood = true

    const { period, hour, minute } = spoken
    const hours =
      hour > 12 || period === 'am'
        ? [hour]
        : period === 'pm'
          ? [hour === 12 ? 12 : hour + 12]
          : hour === 12
            ? [12]
            : [hour, hour + 12]
    const wanted = hours.map((h) => h * 60 + minute)
    const open = slots.filter((slot) => wanted.includes(parseSlot(slot).minutes))
    if (open.length === 1) return open[0]
  }
  return understood ? 'closed' : null
}
