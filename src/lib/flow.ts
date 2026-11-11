import { USER } from '../data'
import type { Draft } from '../state/booking'

/** 예약 흐름 화면들의 순서 (PRD 5장). 갈림길 화면은 그 길로 갔을 때만 기록에 들어간다 */
const ORDER: { path: string; taken: (d: Draft) => boolean }[] = [
  { path: '/hospital', taken: () => true },
  { path: '/hospital/choose', taken: (d) => !!d.hospitalId && d.hospitalId !== USER.lastHospitalId },
  { path: '/doctor', taken: () => true },
  { path: '/doctor/choose', taken: (d) => d.doctorMode === 'picked' },
  { path: '/time', taken: () => true },
  { path: '/time/check', taken: () => true },
  { path: '/time/change', taken: () => false },
  { path: '/identity', taken: () => true },
  { path: '/identity/other', taken: () => false },
  { path: '/identity/birth', taken: () => true },
  { path: '/visit-reason', taken: () => true },
  { path: '/confirm', taken: () => true },
]

export const FLOW_PATHS = ORDER.map((o) => o.path)

export const isFlowPath = (pathname: string) => FLOW_PATHS.includes(pathname)

/**
 * 이어서 하기로 target 화면에 갈 때 쌓을 기록.
 * 이렇게 쌓아 두면 이어서 한 뒤에도 "이전으로"·뒤로 가기가 바로 앞 질문으로 간다 (FR-25).
 * target에 쿼리(?page=2)가 붙어 있으면 마지막 항목에 그대로 둔다.
 */
export function historyChain(draft: Draft, target: string): string[] {
  const pathname = target.split('?')[0]
  if (!isFlowPath(pathname)) return ['/hospital']
  const chain: string[] = []
  for (const { path, taken } of ORDER) {
    if (path === pathname) {
      chain.push(target)
      break
    }
    if (taken(draft)) chain.push(path)
  }
  return chain
}
