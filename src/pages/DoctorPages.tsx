import { useNavigate } from 'react-router'
import { Avatar } from '../components/Avatar'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { VoiceYesNo } from '../components/VoiceAnswer'
import { doctorsOf } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { fastestDoctor, openSlots } from '../lib/schedule'
import { dayInfo, formatSlotTime } from '../lib/time'
import { nextRoute, reduce, useBooking } from '../state/booking'

/** 선생님 확인 (FR-06): 가장 빨리 볼 수 있는 선생님을 먼저 제안한다 */
export function DoctorConfirmPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/hospital')
  const day = dayInfo()
  const fastest = fastestDoctor(draft.hospitalId!)

  if (!fastest) {
    return (
      <ScreenLayout
        stage={1}
        question={`이 병원은 ${day.word} 예약할 수 있는 시간이 없어요.`}
        help="다른 병원을 골라 주세요."
        onBack={goBack}
      >
        <ButtonStack>
          <BigButton onClick={() => navigate('/hospital/choose')}>다른 병원으로 할게요</BigButton>
        </ButtonStack>
      </ScreenLayout>
    )
  }

  const chooseFastest = () => {
    const action = { type: 'doctor', id: fastest.doctor.id, mode: 'fastest' } as const
    dispatch(action)
    navigate(nextRoute(reduce(draft, action), '/time'))
  }

  return (
    <ScreenLayout
      stage={1}
      question={`${day.word} 가장 빨리 볼 수 있는 선생님으로 할까요?`}
      help={`${fastest.doctor.name} 선생님, ${day.word} ${formatSlotTime(fastest.slot)}부터 볼 수 있어요.`}
      voice={<VoiceYesNo onYes={chooseFastest} onNo={() => navigate('/doctor/choose')} />}
      onBack={goBack}
    >
      <ButtonStack>
        <BigButton selected={draft.doctorMode === 'fastest'} onClick={chooseFastest}>
          네, 빨리 볼게요
        </BigButton>
        <BigButton
          variant="secondary"
          selected={draft.doctorMode === 'picked'}
          onClick={() => navigate('/doctor/choose')}
        >
          선생님을 고를게요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}

/** 선생님 고르기 (FR-07): 이니셜 아바타, 이름, 가장 빠른 진료 시간 */
export function DoctorChoosePage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/doctor')
  const day = dayInfo()

  const choose = (id: string) => {
    const action = { type: 'doctor', id, mode: 'picked' } as const
    dispatch(action)
    navigate(nextRoute(reduce(draft, action), '/time'))
  }

  return (
    <ScreenLayout stage={1} question="어느 선생님께 진료받을까요?" help="선생님을 한 분 눌러 주세요." onBack={goBack}>
      <ButtonStack label="선생님 목록">
        {doctorsOf(draft.hospitalId!).map((doctor) => {
          const first = openSlots(doctor)[0]
          return (
            <BigButton
              key={doctor.id}
              variant="secondary"
              leading={<Avatar doctor={doctor} />}
              selected={draft.doctorId === doctor.id}
              disabled={!first}
              description={
                first ? `가장 빠른 진료: ${day.word} ${formatSlotTime(first)}` : `${day.word}은 예약이 다 찼어요`
              }
              onClick={() => choose(doctor.id)}
            >
              {doctor.name} 선생님
            </BigButton>
          )
        })}
      </ButtonStack>
    </ScreenLayout>
  )
}
