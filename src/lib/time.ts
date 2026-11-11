/**
 * 날짜·시각 규칙을 한 곳에서 관리한다 (FR-11).
 * 모든 화면 문구의 "오늘/내일"과 날짜는 반드시 여기의 dayInfo()를 거친다.
 */

/** 진료 시간: 첫 예약 오전 9시, 마지막 예약 오후 5시 30분, 30분 단위 */
export const FIRST_SLOT_MIN = 9 * 60
export const LAST_SLOT_MIN = 17 * 60 + 30
export const SLOT_STEP_MIN = 30
/** 예약 시각보다 이만큼 먼저 병원에 오도록 안내한다 (FR-22) */
export const ARRIVE_EARLY_MIN = 10

const OFFSET_KEY = 'easy-booking:now-offset'

/**
 * 시험용 현재 시각 바꾸기: 주소에 ?now=17:40 또는 ?now=2026-11-11T17:40 을 붙여 접속하면
 * 그 시각부터 시계가 흐른다. 탭을 닫을 때까지 유지되고, ?now=reset 으로 되돌린다.
 */
export function initNowOverride() {
  try {
    const param = new URLSearchParams(window.location.search).get('now')
    if (!param) return
    if (param === 'reset') {
      sessionStorage.removeItem(OFFSET_KEY)
      return
    }
    const real = new Date()
    let target: Date
    if (/^\d{1,2}:\d{2}$/.test(param)) {
      const [h, m] = param.split(':').map(Number)
      target = new Date(real)
      target.setHours(h, m, 0, 0)
    } else {
      target = new Date(param)
    }
    if (!Number.isNaN(target.getTime())) {
      sessionStorage.setItem(OFFSET_KEY, String(target.getTime() - real.getTime()))
    }
  } catch {
    // 저장소를 쓸 수 없으면 실제 시각을 쓴다
  }
}

export function now(): Date {
  let offset = 0
  try {
    offset = Number(sessionStorage.getItem(OFFSET_KEY)) || 0
  } catch {
    offset = 0
  }
  return new Date(Date.now() + offset)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' (현지 시각 기준) */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export type DayInfo = {
  /** 예약할 날의 'YYYY-MM-DD' */
  key: string
  date: Date
  isTomorrow: boolean
  /** 문구에 쓰는 말: "오늘" / "내일" */
  word: '오늘' | '내일'
  /** "11월 11일 수요일" */
  label: string
}

/** 예약할 날. 오후 5시 30분 이후에 접속하면 내일이다 (FR-11) */
export function dayInfo(at: Date = now()): DayInfo {
  const isTomorrow = minutesOfDay(at) >= LAST_SLOT_MIN
  const date = new Date(at.getFullYear(), at.getMonth(), at.getDate() + (isTomorrow ? 1 : 0))
  return {
    key: dateKey(date),
    date,
    isTomorrow,
    word: isTomorrow ? '내일' : '오늘',
    label: formatDate(date),
  }
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

/** "11월 11일 수요일" */
export const formatDate = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`

/** 예약 시간 값: 'YYYY-MM-DDTHH:MM' (현지 시각) */
export type Slot = string

export const makeSlot = (day: string, minutes: number): Slot =>
  `${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

export function parseSlot(slot: Slot) {
  const [day, hm] = slot.split('T')
  const [h, m] = hm.split(':').map(Number)
  const [y, mo, d] = day.split('-').map(Number)
  return { day, minutes: h * 60 + m, date: new Date(y, mo - 1, d, h, m) }
}

/** 하루 중 분 → "오후 2시 30분", "오전 9시" */
export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${period} ${h12}시${m ? ` ${m}분` : ''}`
}

export const formatSlotTime = (slot: Slot) => formatMinutes(parseSlot(slot).minutes)

/** 병원에 와야 하는 시각 (예약 10분 전) */
export const formatArriveBy = (slot: Slot) => formatMinutes(parseSlot(slot).minutes - ARRIVE_EARLY_MIN)

export const isMorning = (slot: Slot) => parseSlot(slot).minutes < 12 * 60

/** 예약 날짜를 지금 기준으로 부르는 말: "오늘" / "내일" / "11월 13일 금요일" */
export function dayWordOf(slot: Slot, at: Date = now()) {
  const { day, date } = parseSlot(slot)
  if (day === dateKey(at)) return '오늘'
  const tomorrow = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1)
  if (day === dateKey(tomorrow)) return '내일'
  return formatDate(date)
}

/** "내일 오전 9시", "오늘 오후 2시 30분" (오늘·내일이 아니면 날짜를 붙인다) */
export const formatSlotWithDay = (slot: Slot, at: Date = now()) => `${dayWordOf(slot, at)} ${formatSlotTime(slot)}`

/** "오늘, 11월 11일 수요일 오후 2시 30분" 처럼 쓰기 위한 조각들 */
export function slotParts(slot: Slot, at: Date = now()) {
  const { date } = parseSlot(slot)
  const word = dayWordOf(slot, at)
  return {
    /** 오늘/내일이 아니면 날짜와 같아지므로 비운다 */
    word: word === '오늘' || word === '내일' ? word : null,
    date: formatDate(date),
    time: formatSlotTime(slot),
  }
}

/** 받침에 맞춰 "은"/"는"을 붙인다 (오후 2시는, 오후 2시 30분은) */
export function withEunNeun(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}은(는)`
  return word + (code % 28 === 0 ? '는' : '은')
}

/** 받침에 맞춰 "으로"/"로"를 붙인다 (샘물내과의원으로, 한빛의료로) */
export function withRo(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}(으)로`
  const jong = code % 28
  return word + (jong === 0 || jong === 8 ? '로' : '으로')
}

/** 예약할 날에 아직 지나지 않은 30분 단위 시각들 */
export function candidateSlots(at: Date = now()): Slot[] {
  const day = dayInfo(at)
  const from = day.isTomorrow ? -1 : minutesOfDay(at)
  const slots: Slot[] = []
  for (let m = FIRST_SLOT_MIN; m <= LAST_SLOT_MIN; m += SLOT_STEP_MIN) {
    if (m > from) slots.push(makeSlot(day.key, m))
  }
  return slots
}
