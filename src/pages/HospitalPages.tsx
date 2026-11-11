import { useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { findHospital, HOSPITALS, USER } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { withRo } from '../lib/time'
import { nextRoute, reduce, useBooking } from '../state/booking'

/** 병원 확인 (FR-04): 기억하게 하지 않고 지난번 병원을 먼저 제안한다 */
export function HospitalConfirmPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const last = findHospital(USER.lastHospitalId)!

  const chooseLast = () => {
    const action = { type: 'hospital', id: last.id } as const
    dispatch(action)
    navigate(nextRoute(reduce(draft, action), '/doctor'))
  }

  return (
    <ScreenLayout
      stage={1}
      question={`지난번에 가신 ${withRo(last.name)} 예약할까요?`}
      help={`${last.neighborhood}에 있는 ${last.department}예요.`}
      onBack={goBack}
    >
      <ButtonStack>
        <BigButton selected={draft.hospitalId === last.id} onClick={chooseLast}>
          네, 여기로 할게요
        </BigButton>
        <BigButton
          variant="secondary"
          selected={!!draft.hospitalId && draft.hospitalId !== last.id}
          onClick={() => navigate('/hospital/choose')}
        >
          다른 병원으로 할게요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}

/** 다른 병원 고르기 (FR-05): 검색창·지도 없이 큰 카드 3개 */
export function HospitalChoosePage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/hospital')

  const choose = (id: string) => {
    const action = { type: 'hospital', id } as const
    dispatch(action)
    navigate(nextRoute(reduce(draft, action), '/doctor'))
  }

  return (
    <ScreenLayout stage={1} question="어느 병원으로 예약할까요?" help="병원을 하나 눌러 주세요." onBack={goBack}>
      <ButtonStack label="병원 목록">
        {HOSPITALS.map((h) => (
          <BigButton
            key={h.id}
            variant="secondary"
            selected={draft.hospitalId === h.id}
            description={`${h.department}, ${h.neighborhood}`}
            onClick={() => choose(h.id)}
          >
            {h.name}
          </BigButton>
        ))}
      </ButtonStack>
    </ScreenLayout>
  )
}
