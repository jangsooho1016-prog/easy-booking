import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { progressSummary, ResumePrompt } from '../components/ResumePrompt'
import { ScreenLayout } from '../components/ScreenLayout'
import { useResume } from '../hooks/useResume'
import { dayInfo } from '../lib/time'
import { upcomingBookings, useBooking } from '../state/booking'

/**
 * 시작 화면. 상황에 따라 셋 중 하나를 보여 준다.
 * - 진행 중인 예약이 없으면: 인사와 [예약 시작하기] (FR-01, FR-11)
 * - 앱을 새로 열었는데 저장된 예약이 있으면: "이어서 할까요?" (FR-03)
 * - 예약 도중 이전으로·뒤로 가기로 여기까지 오면: "정말 나가시겠어요?" (FR-27)
 */
export function StartPage() {
  const { draft, dispatch, resumePending, setResumePending, bookings } = useBooking()
  const navigate = useNavigate()
  const resume = useResume()
  // 시작 버튼을 누른 뒤 다음 화면이 그려지기 전까지 "정말 나가시겠어요?"가 잠깐 비치지 않게 한다
  const [leaving, setLeaving] = useState(false)

  const startOver = () => {
    setLeaving(true)
    setResumePending(false)
    dispatch({ type: 'start' })
    navigate('/hospital')
  }

  // 완료된 예약이 있으면 [내 예약 보기]를 함께 보여 준다 (FR-02)
  const myBookingsButton = upcomingBookings(bookings).length > 0 && (
    <BigButton variant="secondary" onClick={() => navigate('/my')}>
      내 예약 보기
    </BigButton>
  )

  if (draft.started && resumePending) {
    return <ResumePrompt draft={draft} onContinue={resume} onRestart={startOver} extra={myBookingsButton} />
  }

  if (draft.started && !leaving) {
    return (
      <ScreenLayout
        question="하시던 예약이 있어요. 정말 나가시겠어요?"
        help={`나가도 고른 내용은 그대로 남아 있어요. ${progressSummary(draft)}`}
      >
        <ButtonStack>
          <BigButton onClick={resume}>계속 예약할게요</BigButton>
          {/* 나가도 진행 내용은 지우지 않는다. 다음에 열면 "이어서 할까요?"를 묻는다 */}
          <BigButton variant="secondary" onClick={() => setResumePending(true)}>
            나갈게요
          </BigButton>
        </ButtonStack>
      </ScreenLayout>
    )
  }

  const day = dayInfo()
  return (
    <ScreenLayout
      question={
        day.isTomorrow
          ? '오늘 진료는 끝났어요. 내일 가장 빠른 시간으로 예약할까요?'
          : '안녕하세요. 오늘 병원 예약을 도와드릴게요.'
      }
      help={day.isTomorrow ? `내일은 ${day.label}이에요.` : `오늘은 ${day.label}이에요.`}
      note="연습용 앱이에요. 실제 병원에는 예약되지 않아요."
    >
      <ButtonStack>
        <BigButton onClick={startOver}>{day.isTomorrow ? '내일 예약 시작하기' : '예약 시작하기'}</BigButton>
        {myBookingsButton}
      </ButtonStack>
    </ScreenLayout>
  )
}
