import { useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { VISIT_REASONS, type VisitReasonId } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { useBooking } from '../state/booking'

/** 방문 이유 (FR-20): 글자를 직접 입력하는 칸 없이 고르기만 한다. 넘어가도 된다 */
export function VisitReasonPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/identity/birth')

  const choose = (reason: VisitReasonId) => {
    dispatch({ type: 'visitReason', reason })
    navigate('/confirm')
  }

  return (
    <ScreenLayout stage={4} question="어떤 일로 오시나요?" help="하나를 눌러 주세요. 말하지 않아도 괜찮아요." onBack={goBack}>
      <div className="flex flex-col gap-8">
        <ButtonStack label="방문 이유">
          {VISIT_REASONS.map((r) => (
            <BigButton
              key={r.id}
              variant="secondary"
              selected={draft.visitReason === r.id}
              onClick={() => choose(r.id)}
            >
              {r.label}
            </BigButton>
          ))}
        </ButtonStack>
        <ButtonStack>
          <BigButton variant="secondary" selected={draft.visitReason === 'skip'} onClick={() => choose('skip')}>
            말하지 않고 넘어갈게요
          </BigButton>
        </ButtonStack>
      </div>
    </ScreenLayout>
  )
}
