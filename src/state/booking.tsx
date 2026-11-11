import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { findDoctor, USER, type VisitReasonId } from '../data'
import { beginMeasure, finishMeasure } from '../lib/measure'
import { isSlotOpen } from '../lib/schedule'
import { load, remove, save } from '../lib/storage'
import { now, parseSlot, type Slot } from '../lib/time'

/* ───────────── 진행 중인 예약 ───────────── */

export type Draft = {
  started: boolean
  hospitalId: string | null
  doctorId: string | null
  /** fastest = "네, 빨리 볼게요", picked = "선생님을 고를게요" */
  doctorMode: 'fastest' | 'picked' | null
  slot: Slot | null
  /** "김영희 님 맞으세요?"에 [네, 맞아요]를 눌렀는지 */
  nameConfirmed: boolean
  /** 누른 생년월일 숫자 (0~6자리) */
  birthDigits: string
  birthVerified: boolean
  /** 방문 이유 (FR-20). 'skip' = [말하지 않고 넘어갈게요] */
  visitReason: VisitReasonId | null
  /** 되읽기에서 [다시 고를게요]로 한 항목만 바꾸는 중인지 (FR-13) */
  editing: boolean
}

export const EMPTY_DRAFT: Draft = {
  started: false,
  hospitalId: null,
  doctorId: null,
  doctorMode: null,
  slot: null,
  nameConfirmed: false,
  birthDigits: '',
  birthVerified: false,
  visitReason: null,
  editing: false,
}

export type Action =
  | { type: 'start' }
  | { type: 'hospital'; id: string }
  | { type: 'doctor'; id: string; mode: 'fastest' | 'picked' }
  | { type: 'slot'; slot: Slot }
  | { type: 'editing'; on: boolean }
  | { type: 'nameConfirmed' }
  | { type: 'digits'; digits: string }
  | { type: 'birthVerified' }
  | { type: 'visitReason'; reason: VisitReasonId }
  | { type: 'reset' }

/**
 * 순수 함수. 화면에서 "고른 뒤의 상태"를 미리 계산해 다음 화면을 정할 때도 쓴다.
 * 한 항목을 바꿔도 다른 항목은 지우지 않는다 (원칙 4, FR-13).
 * 단, 병원을 바꾸면 그 병원에 없는 선생님 선택만 비운다.
 */
export function reduce(draft: Draft, action: Action): Draft {
  switch (action.type) {
    case 'start':
      return { ...EMPTY_DRAFT, started: true }
    case 'hospital':
      if (draft.hospitalId === action.id) return draft
      return { ...draft, hospitalId: action.id, doctorId: null, doctorMode: null }
    case 'doctor':
      return { ...draft, doctorId: action.id, doctorMode: action.mode }
    case 'slot':
      return { ...draft, slot: action.slot }
    case 'editing':
      return draft.editing === action.on ? draft : { ...draft, editing: action.on }
    case 'nameConfirmed':
      return { ...draft, nameConfirmed: true }
    case 'digits':
      return { ...draft, birthDigits: action.digits, birthVerified: false }
    case 'birthVerified':
      return { ...draft, birthVerified: true }
    case 'visitReason':
      return { ...draft, visitReason: action.reason }
    case 'reset':
      return EMPTY_DRAFT
  }
}

/* ───────────── 단계와 경로 ───────────── */

/** 요구 수준: 이 화면을 보려면 어디까지 골라져 있어야 하는지 */
export const LEVEL = {
  started: 0,
  hospital: 1,
  doctor: 2,
  slot: 3,
  name: 4,
  birth: 5,
  reason: 6,
} as const
export type Level = (typeof LEVEL)[keyof typeof LEVEL]

/**
 * 아직 고르지 않은 첫 단계의 경로. upTo 수준까지만 확인한다.
 * 다 골라져 있으면 null.
 */
export function firstMissing(draft: Draft, upTo: Level = LEVEL.reason, at: Date = now()): string | null {
  if (!draft.started) return '/'
  if (upTo >= LEVEL.hospital && !draft.hospitalId) return '/hospital'
  const doctor = findDoctor(draft.doctorId)
  if (upTo >= LEVEL.doctor && (!doctor || doctor.hospitalId !== draft.hospitalId)) return '/doctor'
  if (upTo >= LEVEL.slot && (!doctor || !isSlotOpen(doctor, draft.slot, at))) return '/time'
  if (upTo >= LEVEL.name && !draft.nameConfirmed) return '/identity'
  if (upTo >= LEVEL.birth && (!draft.birthVerified || draft.birthDigits !== USER.birth)) return '/identity/birth'
  if (upTo >= LEVEL.reason && !draft.visitReason) return '/visit-reason'
  return null
}

/**
 * 고른 뒤 갈 화면.
 * 평소에는 흐름의 다음 화면으로, [다시 고를게요]로 바꾸는 중이면
 * 아직 비어 있는 단계(없으면 되읽기 화면)로 바로 간다.
 */
export function nextRoute(after: Draft, normalNext: string) {
  if (!after.editing) return normalNext
  return firstMissing(after, LEVEL.slot) ?? '/time/check'
}

/* ───────────── 완료된 예약 ───────────── */

export type Booking = {
  id: string
  hospitalId: string
  doctorId: string
  slot: Slot
  patientName: string
  visitReason: VisitReasonId | null
  createdAt: string
}

const BOOKINGS_KEY = 'bookings'

/** 아직 지나지 않은 예약만, 빠른 순서로 (내 예약, 시작 화면의 [내 예약 보기]) */
export function upcomingBookings(bookings: Booking[], at: Date = now()) {
  return bookings
    .filter((b) => parseSlot(b.slot).date.getTime() >= at.getTime())
    .sort((a, b) => a.slot.localeCompare(b.slot))
}

/* ───────────── 진행 내용 자동 보존 (FR-24, FR-26) ───────────── */

const DRAFT_KEY = 'draft'
const ROUTE_KEY = 'draft-route'

/** 저장된 진행 내용을 읽는다. 모양이 이상하면 버린다 */
function loadDraft(): Draft {
  const raw = load<Partial<Draft> | null>(DRAFT_KEY, null)
  if (!raw || typeof raw !== 'object' || raw.started !== true) return EMPTY_DRAFT
  const draft = { ...EMPTY_DRAFT, ...raw }
  if (typeof draft.birthDigits !== 'string' || !/^\d{0,6}$/.test(draft.birthDigits)) draft.birthDigits = ''
  return draft
}

function persistDraft(draft: Draft) {
  if (draft.started) {
    save(DRAFT_KEY, draft)
  } else {
    remove(DRAFT_KEY)
    remove(ROUTE_KEY)
  }
}

/** 마지막으로 보던 흐름 화면 주소 (이어서 하기에서 돌아갈 곳) */
export const saveDraftRoute = (route: string) => save(ROUTE_KEY, route)
export const loadDraftRoute = () => load<string | null>(ROUTE_KEY, null)

/* ───────────── Context ───────────── */

type BookingContextValue = {
  draft: Draft
  dispatch: (action: Action) => void
  bookings: Booking[]
  /** 진행 중인 예약을 완료된 예약으로 저장한다 (FR-23). 진행 내용은 완료 화면이 비운다 */
  completeBooking: () => Booking | null
  /**
   * 저장된 진행 내용이 있어 "이어서 할까요?"를 먼저 물어야 하는지 (FR-03).
   * 앱을 새로 열었거나 새로고침했을 때, 또는 [나갈게요]로 나갔을 때 true.
   */
  resumePending: boolean
  setResumePending: (pending: boolean) => void
  /** 완료된 예약 취소 (FR-29) */
  cancelBooking: (id: string) => void
  /** 다음 화면에 한 번만 보여 줄 안내 (예: "예약을 취소했어요.") */
  notice: string | null
  setNotice: (notice: string | null) => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadDraft)
  const [draft, setDraft] = useState<Draft>(initial)
  const draftRef = useRef(initial)
  const [resumePending, setResumePending] = useState(initial.started)
  const [bookings, setBookings] = useState<Booking[]>(() => load<Booking[]>(BOOKINGS_KEY, []))

  // 고르거나 누를 때마다 그 자리에서 바로 저장한다 (화면을 그리기 전에)
  const dispatch = useCallback((action: Action) => {
    if (action.type === 'start') beginMeasure() // 측정 모드 (FR-34)
    const next = reduce(draftRef.current, action)
    if (next === draftRef.current) return
    draftRef.current = next
    persistDraft(next)
    setDraft(next)
  }, [])

  const completeBooking = useCallback(() => {
    if (firstMissing(draft) !== null) return null
    const booking: Booking = {
      id: Date.now().toString(36),
      hospitalId: draft.hospitalId!,
      doctorId: draft.doctorId!,
      slot: draft.slot!,
      patientName: USER.name,
      visitReason: draft.visitReason === 'skip' ? null : draft.visitReason,
      createdAt: now().toISOString(),
    }
    const next = [...bookings, booking]
    setBookings(next)
    save(BOOKINGS_KEY, next)
    finishMeasure(booking.id)
    // 진행 내용은 완료 화면에 도착한 뒤 비운다. 여기서 비우면 지금 화면의 Guard가
    // 먼저 반응해 시작 화면으로 보낼 수 있다.
    return booking
  }, [draft, bookings])

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) => {
      const next = prev.filter((b) => b.id !== id)
      save(BOOKINGS_KEY, next)
      return next
    })
  }, [])

  const [notice, setNotice] = useState<string | null>(null)

  const value = useMemo(
    () => ({
      draft,
      dispatch,
      bookings,
      completeBooking,
      resumePending,
      setResumePending,
      cancelBooking,
      notice,
      setNotice,
    }),
    [draft, dispatch, bookings, completeBooking, resumePending, cancelBooking, notice],
  )
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking은 BookingProvider 안에서만 쓸 수 있어요')
  return ctx
}
