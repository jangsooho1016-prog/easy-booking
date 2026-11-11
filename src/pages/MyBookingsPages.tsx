import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { BigButton } from '../components/BigButton'
import { BookingDetails } from '../components/BookingDetails'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { findHospital } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { dayWordOf, formatSlotTime, type Slot } from '../lib/time'
import { upcomingBookings, useBooking } from '../state/booking'

/** "오후 2시 30분 샘물내과의원" (오늘이 아니면 앞에 "내일" 등을 붙인다) */
function bookingName(slot: Slot, hospitalId: string) {
  const word = dayWordOf(slot)
  const when = `${word === '오늘' ? '' : `${word} `}${formatSlotTime(slot)}`
  return `${when} ${findHospital(hospitalId)?.name ?? ''}`
}

/** 내 예약 (FR-28): 저장된 예약을 큰 카드로 */
export function MyBookingsPage() {
  const { bookings, notice: pendingNotice, setNotice } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const list = upcomingBookings(bookings)

  // 취소 안내는 이 화면에 들어올 때 한 번만 보여 주고 바로 비운다
  const [notice] = useState(pendingNotice)
  useEffect(() => {
    if (pendingNotice) setNotice(null)
  }, [pendingNotice, setNotice])

  const question = notice ?? (list.length ? '예약하신 내용이에요.' : '아직 예약이 없어요.')
  const help = notice
    ? list.length
      ? '남아 있는 예약이에요.'
      : '남아 있는 예약은 없어요.'
    : list.length > 1
      ? `예약이 ${list.length}개 있어요.`
      : undefined

  return (
    <ScreenLayout question={question} help={help} onBack={goBack}>
      <div className="flex flex-col gap-8">
        {list.map((b) => (
          <section key={b.id} aria-label={`${bookingName(b.slot, b.hospitalId)} 예약`} className="flex flex-col gap-4">
            <BookingDetails {...b} />
            <BigButton variant="danger" onClick={() => navigate(`/my/cancel/${b.id}`)}>
              예약 취소하기
            </BigButton>
          </section>
        ))}
        <ButtonStack>
          <BigButton variant={list.length ? 'secondary' : 'primary'} onClick={() => navigate('/')}>
            처음으로
          </BigButton>
        </ButtonStack>
      </div>
    </ScreenLayout>
  )
}

/** 예약 취소 확인 (FR-29): 무엇을 취소하는지 되읽어 묻는다 */
export function CancelBookingPage() {
  const { id } = useParams()
  const { bookings, cancelBooking, setNotice } = useBooking()
  const goBack = useGoBack('/my')
  const booking = bookings.find((b) => b.id === id)
  // 취소한 직후에는 예약이 목록에서 빠지므로, 뒤로 가는 동안 다른 곳으로 보내지 않게 표시해 둔다
  const [cancelled, setCancelled] = useState(false)

  if (cancelled) return null
  if (!booking) return <Navigate to="/my" replace />
  const name = bookingName(booking.slot, booking.hospitalId)

  const cancel = () => {
    setCancelled(true)
    cancelBooking(booking.id)
    setNotice(`${name} 예약을 취소했어요.`)
    goBack()
  }

  return (
    <ScreenLayout question={`${name} 예약을 취소할까요?`} help="취소하면 되돌릴 수 없어요." onBack={goBack}>
      <ButtonStack>
        <BigButton variant="danger" onClick={cancel}>
          취소할게요
        </BigButton>
        <BigButton variant="secondary" onClick={goBack}>
          그대로 둘게요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}
