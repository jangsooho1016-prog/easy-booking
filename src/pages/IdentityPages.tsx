import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { DigitBoxes, Keypad } from '../components/Keypad'
import { ScreenLayout } from '../components/ScreenLayout'
import { USER } from '../data'
import { VoiceYesNo } from '../components/VoiceAnswer'
import { useGoBack } from '../hooks/useGoBack'
import { countBirthError } from '../lib/measure'
import { useBooking } from '../state/booking'
import { useSettings } from '../state/settings'

const BIRTH_LENGTH = 6

/** 연습용 안내 (FR-19): 본인 확인 화면마다 항상 보여 준다 */
function PracticeNote({ showAnswer = false }: { showAnswer?: boolean }) {
  return (
    <div className="rounded-button border-[3px] border-line px-4 py-3">
      <p>연습용 화면입니다. 실제 개인정보를 입력하지 마세요.</p>
      {showAnswer && <p className="mt-1 font-bold text-ink">연습용 번호: {USER.birth}</p>}
    </div>
  )
}

/** 본인 확인 1 (FR-15): 이름을 기억해 입력하지 않고 확인만 한다 */
export function IdentityNamePage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/time/check')

  const yes = () => {
    dispatch({ type: 'nameConfirmed' })
    navigate('/identity/birth')
  }
  const no = () => navigate('/identity/other')

  return (
    <ScreenLayout
      stage={3}
      question={`예약하시는 분이 ${USER.name} 님 맞으세요?`}
      voice={<VoiceYesNo onYes={yes} onNo={no} />}
      note={<PracticeNote />}
      onBack={goBack}
    >
      <ButtonStack>
        <BigButton selected={draft.nameConfirmed} onClick={yes}>
          네, 맞아요
        </BigButton>
        <BigButton variant="secondary" onClick={no}>
          아니에요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}

/** [아니에요]를 누른 경우: 연습용 앱이라 가상 사용자로만 진행할 수 있음을 알린다 */
export function IdentityOtherPage() {
  const { dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/identity')

  return (
    <ScreenLayout
      stage={3}
      question={`이 연습용 화면에서는 ${USER.name} 님으로만 예약할 수 있어요.`}
      help={`${USER.name} 님이 되어 연습해 보시겠어요?`}
      note={<PracticeNote />}
      onBack={goBack}
    >
      <ButtonStack>
        <BigButton
          onClick={() => {
            dispatch({ type: 'nameConfirmed' })
            navigate('/identity/birth')
          }}
        >
          {USER.name} 님으로 연습할게요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}

/** 6자리를 "50년 1월 1일생"으로 읽는다. 날짜가 될 수 없으면 null */
function readBirth(digits: string) {
  const yy = Number(digits.slice(0, 2))
  const mm = Number(digits.slice(2, 4))
  const dd = Number(digits.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return `${yy}년 ${mm}월 ${dd}일생`
}

/**
 * 본인 확인 2 (FR-16~18): 큰 숫자 키패드로 생년월일 6자리.
 * 6자리가 차도 자동으로 넘어가지 않고, 되읽어 준 뒤 [네, 맞아요]를 눌러야 넘어간다.
 * 틀리면 쉬운 말로 알리고 칸만 비운다. 횟수 제한·잠금 없음.
 */
export function IdentityBirthPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/identity')
  const [error, setError] = useState<string | null>(null)

  const digits = draft.birthDigits
  const complete = digits.length === BIRTH_LENGTH
  const reading = complete ? readBirth(digits) : null

  // 작은 화면에서 키패드 아랫줄(0 등)이 "이전으로"에 가리면, 키패드가 다 보이는 만큼만 내려 준다.
  // (질문 문장은 화면 위에 남는다. 이미 다 보이면 움직이지 않는다)
  const keypadArea = useRef<HTMLDivElement>(null)
  const keypadShown = !(complete && reading)
  useEffect(() => {
    if (!keypadShown || !keypadArea.current) return
    const footer = document.querySelector('footer')?.getBoundingClientRect().height ?? 0
    const overflow = keypadArea.current.getBoundingClientRect().bottom - (window.innerHeight - footer - 8)
    if (overflow > 0) window.scrollBy({ top: overflow })
  }, [keypadShown])

  // 소리로 듣기가 켜져 있으면 되읽기와 오류 안내도 읽어 준다 (FR-17, FR-18, FR-30)
  const { say } = useSettings()
  useEffect(() => {
    if (error) say(error)
    else if (reading) say(`${reading} 맞으세요?`)
  }, [error, reading, say])

  const setDigits = (value: string) => {
    setError(null)
    dispatch({ type: 'digits', digits: value })
  }

  const confirm = () => {
    if (digits === USER.birth) {
      dispatch({ type: 'birthVerified' })
      navigate('/visit-reason')
    } else {
      countBirthError() // 측정 모드 (FR-34)
      dispatch({ type: 'digits', digits: '' })
      setError('번호가 맞지 않아요. 다시 한 번 눌러 주세요.')
    }
  }

  // 안내 한 줄: 처음엔 예시, 누르는 동안엔 몇 자리 눌렀는지, 다 누르면 되읽기, 틀리면 오류 (FR-16~18)
  let status: string
  if (error) status = error
  else if (complete && reading) status = `${reading} 맞으세요?`
  else if (complete) status = '날짜로 읽을 수 없는 번호예요.'
  else if (digits.length === 0) status = '예: 1950년 1월 1일 → 500101'
  else status = `${BIRTH_LENGTH}자리 중 ${digits.length}자리를 눌렀어요.`

  return (
    <ScreenLayout
      stage={3}
      question="생년월일 여섯 자리를 눌러 주세요."
      help={
        // 한 줄 높이를 잡아 두어 문장이 바뀌어도 아래 칸과 키패드가 움직이지 않는다
        <p
          role={error ? 'alert' : 'status'}
          className={'flex min-h-[1.6em] items-center ' + (error || reading ? 'font-bold text-ink' : '')}
        >
          {error && (
            <span
              aria-hidden="true"
              className="mr-2 inline-flex size-[1.4em] shrink-0 items-center justify-center rounded-full bg-ink text-surface"
            >
              !
            </span>
          )}
          {status}
        </p>
      }
      note={<PracticeNote showAnswer />}
      onBack={goBack}
    >
      <DigitBoxes value={digits} length={BIRTH_LENGTH} />

      <div ref={keypadArea} className="mt-3">
        {complete && reading ? (
          // 6자리가 다 차면 키패드 자리에 확인 버튼을 보여 준다. 자동으로 넘어가지 않는다
          <ButtonStack label="생년월일 확인">
            <BigButton onClick={confirm}>네, {reading} 맞아요</BigButton>
            <BigButton variant="secondary" onClick={() => setDigits('')}>
              다시 누를게요
            </BigButton>
          </ButtonStack>
        ) : (
          <Keypad value={digits} maxLength={BIRTH_LENGTH} onChange={setDigits} />
        )}
      </div>
    </ScreenLayout>
  )
}
