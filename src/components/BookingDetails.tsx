import { findDoctor, findHospital, visitReasonLabel, type VisitReasonId } from '../data'
import { slotParts, type Slot } from '../lib/time'

/** 병원·선생님·날짜와 시간·예약자(·방문 이유)를 큰 글씨 목록으로 (FR-21, FR-22, FR-28) */
export function BookingDetails({
  hospitalId,
  doctorId,
  slot,
  patientName,
  visitReason,
}: {
  hospitalId: string
  doctorId: string
  slot: Slot
  patientName: string
  visitReason?: VisitReasonId | null
}) {
  const parts = slotParts(slot)
  const reason = visitReasonLabel(visitReason)
  const rows = [
    ['병원', findHospital(hospitalId)?.name],
    ['선생님', `${findDoctor(doctorId)?.name} 선생님`],
    ['날짜와 시간', `${parts.word ? `${parts.word}, ` : ''}${parts.date} ${parts.time}`],
    ['예약하시는 분', `${patientName} 님`],
    ...(reason ? [['방문 이유', reason]] : []),
  ]
  return (
    <dl className="divide-y-2 divide-canvas rounded-button border-[3px] border-primary">
      {rows.map(([label, value]) => (
        <div key={label} className="px-5 py-4">
          <dt className="text-body text-ink-muted">{label}</dt>
          <dd className="mt-0.5 text-button font-bold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
