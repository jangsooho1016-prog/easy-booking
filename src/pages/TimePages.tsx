import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BigButton } from '../components/BigButton'
import { ButtonStack } from '../components/ButtonStack'
import { ScreenLayout } from '../components/ScreenLayout'
import { NOT_UNDERSTOOD, VoiceAnswer, VoiceYesNo } from '../components/VoiceAnswer'
import { findDoctor, findHospital } from '../data'
import { useGoBack } from '../hooks/useGoBack'
import { openSlots } from '../lib/schedule'
import {
  dayInfo,
  formatSlotTime,
  formatSlotWithDay,
  isMorning,
  now,
  parseSlot,
  slotParts,
  withEunNeun,
  withRo,
  type Slot,
} from '../lib/time'
import { matchTime } from '../lib/voiceMatch'
import { nextRoute, reduce, useBooking } from '../state/booking'

const PAGE_SIZE = 6

/**
 * 시간 선택 (FR-08~10).
 * 예약 가능한 시간만 큰 버튼으로, 오전/오후로 묶어 한 화면에 최대 6개.
 * [예약 가능한 시간 더 보기]는 주소의 ?page를 바꾸므로 뒤로 가기로 앞 시간으로 돌아올 수 있다.
 */
export function TimeSelectPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/doctor')
  const [params, setParams] = useSearchParams()
  const day = dayInfo()
  const doctor = findDoctor(draft.doctorId)!
  const slots = openSlots(doctor)

  const pageCount = Math.max(1, Math.ceil(slots.length / PAGE_SIZE))
  // 주소에 쪽이 없으면, 이미 고른 시간이 있는 쪽을 먼저 보여 준다 (FR-25)
  const selectedIndex = draft.slot ? slots.indexOf(draft.slot) : -1
  const defaultPage = selectedIndex >= 0 ? Math.floor(selectedIndex / PAGE_SIZE) + 1 : 1
  const page = Math.min(pageCount, Math.max(1, Number(params.get('page')) || defaultPage))
  const shown = slots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const groups = [
    // 묶음 제목에도 "오늘/내일"을 붙여 어느 날인지 늘 보이게 한다 (FR-11)
    { name: `${day.word} 오전`, slots: shown.filter(isMorning) },
    { name: `${day.word} 오후`, slots: shown.filter((s) => !isMorning(s)) },
  ].filter((g) => g.slots.length > 0)

  const choose = (slot: Slot) => {
    const action = { type: 'slot', slot } as const
    dispatch(action)
    navigate(nextRoute(reduce(draft, action), '/time/check'))
  }

  const goPage = (n: number) => setParams({ page: String(n) })

  // 전에 고른 시간을 더는 쓸 수 없으면(시간이 지났거나, 선생님을 바꿨는데 그 시간이 찼으면)
  // 말없이 사라지게 하지 않고 이유를 알려 준다 (원칙 4)
  let help = `${day.word}, ${day.label}에 ${doctor.name} 선생님께 예약할 수 있는 시간이에요.`
  if (draft.slot && !slots.includes(draft.slot)) {
    const before = withEunNeun(formatSlotWithDay(draft.slot))
    help =
      parseSlot(draft.slot).date.getTime() <= now().getTime()
        ? `고르셨던 ${before} 이미 지났어요. 다른 시간을 골라 주세요.`
        : `고르셨던 ${before} ${doctor.name} 선생님 예약이 다 찼어요. 다른 시간을 골라 주세요.`
  }

  return (
    <ScreenLayout
      stage={2}
      question="몇 시에 오실 수 있으세요?"
      help={help}
      // 말로 고르기 (FR-33): 다른 쪽에 있는 시간도 말하면 고를 수 있다
      voice={
        <VoiceAnswer
          onHeard={(texts) => {
            const heard = matchTime(texts, slots)
            if (heard === null) return NOT_UNDERSTOOD
            if (heard === 'closed') return '그 시간에는 예약할 수 없어요. 다른 시간을 말씀하시거나 버튼을 눌러 주세요.'
            choose(heard)
          }}
        />
      }
      onBack={goBack}
    >
      <div className="flex flex-col gap-8">
        {groups.map((group, gi) => (
          <section key={group.name} aria-labelledby={`slot-group-${gi}`}>
            <h2 id={`slot-group-${gi}`} className="mb-3 text-button font-bold text-ink">
              {group.name}
            </h2>
            <ButtonStack label={`${group.name} 시간`}>
              {group.slots.map((slot) => (
                <BigButton
                  key={slot}
                  variant="secondary"
                  selected={draft.slot === slot}
                  onClick={() => choose(slot)}
                >
                  {formatSlotTime(slot)}
                </BigButton>
              ))}
            </ButtonStack>
          </section>
        ))}

        {pageCount > 1 && (
          <ButtonStack label="시간 더 보기">
            {page < pageCount && (
              <BigButton variant="secondary" onClick={() => goPage(page + 1)}>
                예약 가능한 시간 더 보기
              </BigButton>
            )}
            {page > 1 && (
              <BigButton variant="secondary" onClick={() => goPage(page - 1)}>
                앞의 시간 다시 보기
              </BigButton>
            )}
          </ButtonStack>
        )}
      </div>
    </ScreenLayout>
  )
}

/** 되읽기 확인 (FR-12, FR-13): 고른 내용을 한 문장으로 되읽어 준다 */
export function TimeCheckPage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/time')
  const hospital = findHospital(draft.hospitalId)!
  const doctor = findDoctor(draft.doctorId)!
  const parts = slotParts(draft.slot!)

  // 여기까지 오면 "한 항목만 바꾸기"는 끝난 것이다
  useEffect(() => {
    dispatch({ type: 'editing', on: false })
  }, [dispatch])

  const strong = 'text-emphasis font-bold text-primary'
  const hospitalWithRo = withRo(hospital.name)
  const particle = hospitalWithRo.slice(hospital.name.length)

  return (
    <ScreenLayout
      stage={2}
      question={
        <>
          {parts.word && <span className={strong}>{parts.word}, </span>}
          <span className={strong}>{parts.date}</span> <span className={strong}>{parts.time}</span>,{' '}
          <span className={strong}>{hospital.name}</span>
          {particle} 예약할까요?
        </>
      }
      help={`진료는 ${doctor.name} 선생님이 봐 드려요.`}
      voice={<VoiceYesNo onYes={() => navigate('/identity')} onNo={() => navigate('/time/change')} />}
      onBack={goBack}
    >
      <ButtonStack>
        <BigButton onClick={() => navigate('/identity')}>맞아요</BigButton>
        <BigButton variant="secondary" onClick={() => navigate('/time/change')}>
          다시 고를게요
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}

/** 무엇을 바꿀지 묻기 (FR-13): 고른 항목만 바꾸고 나머지는 그대로 둔다 */
export function TimeChangePage() {
  const { draft, dispatch } = useBooking()
  const navigate = useNavigate()
  const goBack = useGoBack('/time/check')
  const hospital = findHospital(draft.hospitalId)!
  const doctor = findDoctor(draft.doctorId)!

  const change = (to: string) => {
    dispatch({ type: 'editing', on: true })
    navigate(to)
  }

  return (
    <ScreenLayout stage={2} question="무엇을 바꾸시겠어요?" help="고르지 않은 것은 그대로 둘게요." onBack={goBack}>
      <ButtonStack>
        <BigButton variant="secondary" description={`지금: ${hospital.name}`} onClick={() => change('/hospital/choose')}>
          병원
        </BigButton>
        <BigButton variant="secondary" description={`지금: ${doctor.name} 선생님`} onClick={() => change('/doctor/choose')}>
          선생님
        </BigButton>
        <BigButton variant="secondary" description={`지금: ${formatSlotWithDay(draft.slot!)}`} onClick={() => change('/time')}>
          시간
        </BigButton>
      </ButtonStack>
    </ScreenLayout>
  )
}
