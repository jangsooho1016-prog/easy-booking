import { doctorsOf, type Doctor } from '../data'
import { candidateSlots, now, parseSlot, type Slot } from './time'

/**
 * 의사별 예약 가능 시간 (PRD 7장: 의사마다 일부 시간을 마감 처리).
 * 마감 여부는 의사·날짜·시각으로 정해지는 고정값이라 새로고침해도 바뀌지 않는다.
 * 마감된 시간은 화면에 아예 보여 주지 않는다 (FR-09).
 */

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function isClosed(doctor: Doctor, slot: Slot) {
  const { minutes } = parseSlot(slot)
  // 병원의 첫 번째 선생님은 마지막 시간(오후 5시 30분)을 항상 비워 둔다.
  // 그래야 오후 5시 30분 전에 접속하면 어느 병원이든 오늘 예약할 시간이 하나는 있다.
  const isFirstDoctor = doctorsOf(doctor.hospitalId)[0]?.id === doctor.id
  if (isFirstDoctor && minutes === 17 * 60 + 30) return false
  return hash(`${doctor.id}|${slot}`) % 10 < 3 // 약 30% 마감
}

export function openSlots(doctor: Doctor, at: Date = now()): Slot[] {
  return candidateSlots(at).filter((slot) => !isClosed(doctor, slot))
}

export function isSlotOpen(doctor: Doctor, slot: Slot | null, at: Date = now()) {
  return !!slot && openSlots(doctor, at).includes(slot)
}

/** 가장 빨리 볼 수 있는 선생님과 그 시간 (FR-06) */
export function fastestDoctor(hospitalId: string, at: Date = now()) {
  let best: { doctor: Doctor; slot: Slot } | null = null
  for (const doctor of doctorsOf(hospitalId)) {
    const first = openSlots(doctor, at)[0]
    if (first && (!best || first < best.slot)) best = { doctor, slot: first }
  }
  return best
}
