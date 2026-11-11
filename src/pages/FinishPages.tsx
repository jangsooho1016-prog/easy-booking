import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { BookingDetails } from '../components/BookingDetails'
import { USER } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { dayWordOf, formatArriveBy } from '../lib/time'
import { useBooking } from '../state/booking'

/** 최종 확인 (FR-21) */
export function FinalConfirmPage() {
  const { draft, completeBooking } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/visit-reason')

  const book = () => {
    const booking = completeBooking()
    if (booking) navigate(`/done/${booking.id}`, { replace: true })
  }

  return (
    <ScreenLayout stage={4} question="이대로 예약할까요?" help="내용을 한 번 더 확인해 주세요." onBack={goBack}>
      <BookingDetails
        hospitalId={draft.hospitalId!}
        doctorId={draft.doctorId!}
        slot={draft.slot!}
        patientName={USER.name}
        visitReason={draft.visitReason}
      />
      <div className="mt-8">
        <BigButton onClick={book}>예약하기</BigButton>
      </div>
    </ScreenLayout>
  )
}

/** 예약 완료 (FR-22, FR-23) */
export function DonePage() {
  const { id } = useParams()
  const { bookings, draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const booking = bookings.find((b) => b.id === id)

  // 완료 화면에 도착하면 진행 중이던 예약을 비운다
  useEffect(() => {
    if (booking && draft.started) dispatch({ type: 'reset' })
  }, [booking, draft.started, dispatch])

  if (!booking) return <Navigate to="/" replace />

  return (
    <ScreenLayout
      question={
        <span className="flex flex-col items-start gap-4">
          <svg
            viewBox="0 0 64 64"
            className="size-[4rem]"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="32" fill="var(--color-primary)" />
            <path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          예약이 끝났어요.
        </span>
      }
    >
      <p className="mb-6 text-button font-bold text-primary">
        {dayWordOf(booking.slot)} {formatArriveBy(booking.slot)}까지 병원에 오시면 됩니다.
      </p>
      <BookingDetails {...booking} />
      <div className="mt-8">
        <ButtonStack>
          <BigButton onClick={() => navigate('/my')}>내 예약 보기</BigButton>
          <BigButton variant="secondary" onClick={() => navigate('/')}>
            처음으로
          </BigButton>
        </ButtonStack>
      </div>
    </ScreenLayout>
  )
}
