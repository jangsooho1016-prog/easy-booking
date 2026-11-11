import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { countBack } from '../lib/measure'
import { useSettings } from '../state/settings'
import { Progress, type Stage } from './Progress'
import { ScreenTools } from './ScreenTools'

type ScreenLayoutProps = {
  /** 진행 안내 단계. 시작·완료처럼 단계 밖 화면에서는 생략한다 */
  stage?: Stage
  /** 화면에 하나뿐인 질문 문장 */
  question: ReactNode
  /** 필요할 때만 쓰는 보조 설명 한 줄 */
  help?: ReactNode
  /** 선택 버튼 등 화면 본문 */
  children?: ReactNode
  /** 화면 아래쪽 안내 (연습용 번호 등) */
  note?: ReactNode
  /**
   * [말로 대답하기] (FR-33). 화면마다 내용 길이가 달라도 늘 같은 자리에 보이도록
   * 본문이 아니라 아래 고정 영역, "← 이전으로" 바로 위에 둔다.
   */
  voice?: ReactNode
  /** "← 이전으로" 동작. 없으면(시작 화면 등) 버튼을 그리지 않는다 */
  onBack?: () => void
}

/**
 * 모든 화면의 공통 틀 (PRD 4.3).
 * 위: 도구(소리로 듣기·글씨 크기) → 진행 안내 / 가운데: 질문 + 보조 설명 / 아래: 버튼
 * 맨 아래 고정: (말로 대답할 수 있는 화면이면) "말로 대답하기" → "← 이전으로"
 */
export function ScreenLayout({ stage, question, help, children, note, voice, onBack }: ScreenLayoutProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  const { say } = useSettings()
  const sayRef = useRef(say)
  sayRef.current = say

  // 화면이 바뀌면(주소가 바뀌거나 같은 주소에서 다른 질문 화면이 열리면)
  // 1) 질문으로 초점을 옮겨 스크린리더가 새 질문부터 읽게 하고 (FR-32)
  // 2) 소리로 듣기가 켜져 있으면 질문을 읽는다 (FR-30, 되읽기 화면은 FR-14)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    const text = headingRef.current?.textContent ?? ''
    // 브라우저 탭·화면 읽기 프로그램에도 지금 질문이 보이게 한다
    document.title = text ? `${text} - 쉬운예약` : '쉬운예약'
    sayRef.current(text)
  }, [location.key])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface">
      <header className="px-gutter pt-2.5">
        <ScreenTools />
        {stage && (
          <div className="mt-2">
            <Progress stage={stage} />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col px-gutter pt-3 pb-8">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-question font-bold text-ink focus:outline-none"
        >
          {question}
        </h1>
        {help && <div className="mt-2 text-body text-ink-muted">{help}</div>}
        {children && <div className="mt-4">{children}</div>}
        {note && <div className="mt-auto pt-8 text-body text-ink-muted">{note}</div>}
      </main>

      {onBack && (
        <footer className="sticky bottom-0 flex flex-col gap-button-gap border-t-2 border-canvas bg-surface px-gutter pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {voice}
          <button
            type="button"
            onClick={() => {
              countBack() // 측정 모드 (FR-34)
              onBack()
            }}
            className={
              'flex w-full min-h-button items-center justify-center gap-2 rounded-button ' +
              'border-[3px] border-ink-muted bg-surface text-button font-semibold text-ink ' +
              'active:bg-canvas'
            }
          >
            <span aria-hidden="true">←</span> 이전으로
          </button>
        </footer>
      )}
    </div>
  )
}
