/**
 * 가상 데이터 (PRD 7장). 실제 병원·인물·개인정보가 아니다.
 */

export type Hospital = {
  id: string
  name: string
  department: string
  neighborhood: string
}

export type Doctor = {
  id: string
  hospitalId: string
  name: string
  /** 이니셜 아바타 배경색. 뜻을 전달하지 않는 장식이다 */
  avatarColor: string
}

export type User = {
  name: string
  /** 생년월일 6자리 (YYMMDD) */
  birth: string
  lastHospitalId: string
}

export const USER: User = {
  name: '김영희',
  birth: '500101',
  lastHospitalId: 'saemmul',
}

export const HOSPITALS: Hospital[] = [
  { id: 'saemmul', name: '샘물내과의원', department: '내과', neighborhood: '샘물동' },
  { id: 'hanbit', name: '한빛가정의학과의원', department: '가정의학과', neighborhood: '한빛동' },
  { id: 'pureun', name: '푸른정형외과의원', department: '정형외과', neighborhood: '푸른동' },
]

export const DOCTORS: Doctor[] = [
  { id: 'saemmul-park', hospitalId: 'saemmul', name: '박지훈', avatarColor: '#d6e9ec' },
  { id: 'saemmul-choi', hospitalId: 'saemmul', name: '최은영', avatarColor: '#f1e4d3' },
  { id: 'hanbit-jung', hospitalId: 'hanbit', name: '정민호', avatarColor: '#dfe6d2' },
  { id: 'hanbit-han', hospitalId: 'hanbit', name: '한수진', avatarColor: '#e8dcea' },
  { id: 'pureun-oh', hospitalId: 'pureun', name: '오태경', avatarColor: '#dde3f0' },
  { id: 'pureun-yoon', hospitalId: 'pureun', name: '윤미라', avatarColor: '#f0dede' },
]

export const findHospital = (id: string | null) => HOSPITALS.find((h) => h.id === id)
export const findDoctor = (id: string | null) => DOCTORS.find((d) => d.id === id)
export const doctorsOf = (hospitalId: string) => DOCTORS.filter((d) => d.hospitalId === hospitalId)

/** 방문 이유 선택지 (FR-20). 글자를 직접 입력하는 칸은 없다 */
export const VISIT_REASONS = [
  { id: 'cold', label: '감기·몸살' },
  { id: 'stomach', label: '배가 아파요' },
  { id: 'refill', label: '늘 받던 약 처방' },
  { id: 'other', label: '그 밖의 일' },
] as const

export type VisitReasonId = (typeof VISIT_REASONS)[number]['id'] | 'skip'

export const visitReasonLabel = (id: VisitReasonId | null | undefined) =>
  VISIT_REASONS.find((r) => r.id === id)?.label ?? null
