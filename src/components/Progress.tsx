/** 진행 안내 4단계 (PRD 5장) */
export const STAGES = ['병원·선생님', '시간', '본인 확인', '마지막 확인'] as const
export type Stage = 1 | 2 | 3 | 4

/**
 * "4단계 중 2단계"를 글자로 보여 주고(PRD 4.3), 오른쪽에 막대를 보조로 둔다.
 * 막대는 글자와 같은 뜻이므로 스크린리더는 읽지 않는다.
 */
export function Progress({ stage }: { stage: Stage }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-body font-bold whitespace-nowrap text-primary">
        {STAGES.length}단계 중 {stage}단계
        <span className="sr-only">, {STAGES[stage - 1]}</span>
      </p>
      <div className="flex min-w-[6em] flex-1 gap-1" aria-hidden="true">
        {STAGES.map((name, i) => (
          <span key={name} className={'h-2 flex-1 rounded-full ' + (i < stage ? 'bg-primary' : 'bg-line/40')} />
        ))}
      </div>
    </div>
  )
}
