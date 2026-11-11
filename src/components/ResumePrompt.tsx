import type { ReactNode } from 'react'
import { findDoctor, findHospital } from '../data'
import { isSlotOpen } from '../lib/schedule'
import { formatSlotWithDay } from '../lib/time'
import type { Draft } from '../state/booking'
import { BigButton } from './BigButton'
import { ButtonStack } from './ButtonStack'
import { ScreenLayout } from './ScreenLayout'

/** 지금까지 고른 것을 한 문장으로 (기억하게 하지 않고 보여 준다) */
export function progressSummary(draft: Draft) {
  const hospital = findHospital(draft.hospitalId)
  const doctor = findDoctor(draft.doctorId)
  const parts = [
    hospital?.name,
    doctor && doctor.hospitalId === hospital?.id ? `${doctor.name} 선생님` : null,
    doctor && isSlotOpen(doctor, draft.slot) ? formatSlotWithDay(draft.slot!) : null,
  ].filter(Boolean)
  return parts.length ? `${parts.join(', ')}까지 고르셨어요.` : '아직 병원을 고르기 전이에요.'
}

/** "하시던 예약이 있어요. 이어서 할까요?" (FR-03) */
export function ResumePrompt({
  draft,
  onContinue,
  onRestart,
  extra,
}: {
  draft: Draft
  onContinue: () => void
  onRestart: () => void
  /** 시작 화면에서는 [내 예약 보기]를 함께 둔다 */
  extra?: ReactNode
}) {
  return (
    <ScreenLayout question="하시던 예약이 있어요. 이어서 할까요?" help={progressSummary(draft)}>
      <ButtonStack>
        <BigButton onClick={onContinue}>이어서 할게요</BigButton>
        <BigButton variant="secondary" onClick={onRestart}>
          처음부터 할게요
        </BigButton>
        {extra}
      </ButtonStack>
    </ScreenLayout>
  )
}
