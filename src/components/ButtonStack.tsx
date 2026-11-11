import type { ReactNode } from 'react'

/**
 * 선택 버튼 묶음. 버튼 사이 간격은 최소 16px (PRD 4.2). 선택지는 화면당 최대 4개 (원칙 1).
 * 버튼은 질문보다 늦게, 위에서부터 차례로 천천히 나타난다 (index.css의 .choice-stack).
 * 질문을 먼저 읽게 하려는 것이며, 화면이 저절로 넘어가지는 않는다.
 */
export function ButtonStack({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="choice-stack flex flex-col gap-button-gap">
      {children}
    </div>
  )
}
