/**
 * 측정 모드 (FR-34). 주소에 ?measure=1 을 붙여 접속하면 켜지고, 탭을 닫을 때까지 유지된다.
 * ?measure=0 으로 끈다. 켜져 있는 동안만 기록하고, 예약 완료 화면 아래에 결과를 보여 준다.
 */
import { load, remove, save } from './storage'

const MODE_KEY = 'easy-booking:measure'
const RUN_KEY = 'measure-run'
const RESULT_KEY = 'measure-result'

type Run = { startedAt: number; birthErrors: number; backs: number }

export type MeasureResult = {
  bookingId: string
  /** 예약 시작부터 [예약하기]까지 걸린 시간(초) */
  seconds: number
  /** 본인 확인에서 번호가 틀린 횟수 */
  birthErrors: number
  /** "이전으로"를 누른 횟수 */
  backs: number
}

export function measureOn() {
  try {
    return sessionStorage.getItem(MODE_KEY) === '1'
  } catch {
    return false
  }
}

const currentRun = () => load<Run | null>(RUN_KEY, null)

/** 예약을 (새로) 시작할 때: 시계와 횟수를 처음으로 돌린다 */
export function beginMeasure() {
  if (measureOn()) save(RUN_KEY, { startedAt: Date.now(), birthErrors: 0, backs: 0 } satisfies Run)
  else remove(RUN_KEY)
}

export function initMeasureMode() {
  try {
    const param = new URLSearchParams(window.location.search).get('measure')
    if (param === '1') sessionStorage.setItem(MODE_KEY, '1')
    else if (param === '0') sessionStorage.removeItem(MODE_KEY)
  } catch {
    // 저장소를 쓸 수 없으면 측정하지 않는다
  }
  // 예약 도중에 측정 모드를 켰으면 그때부터 잰다
  const draft = load<{ started?: boolean } | null>('draft', null)
  if (measureOn() && !currentRun() && draft?.started) beginMeasure()
}

function count(field: 'birthErrors' | 'backs') {
  const run = currentRun()
  if (!measureOn() || !run) return
  save(RUN_KEY, { ...run, [field]: run[field] + 1 })
}

export const countBirthError = () => count('birthErrors')
export const countBack = () => count('backs')

/** 예약이 끝났을 때: 결과를 그 예약 번호로 남긴다 */
export function finishMeasure(bookingId: string) {
  const run = currentRun()
  remove(RUN_KEY)
  if (!measureOn() || !run) return
  save(RESULT_KEY, {
    bookingId,
    seconds: Math.max(0, Math.round((Date.now() - run.startedAt) / 1000)),
    birthErrors: run.birthErrors,
    backs: run.backs,
  } satisfies MeasureResult)
}

/** 완료 화면에 보여 줄 결과. 측정 모드가 꺼져 있거나 이 예약의 기록이 없으면 null */
export function measureResult(bookingId: string): MeasureResult | null {
  if (!measureOn()) return null
  const result = load<MeasureResult | null>(RESULT_KEY, null)
  return result?.bookingId === bookingId ? result : null
}
