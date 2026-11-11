import type { ReactNode } from 'react'

/** 선택 버튼 묶음. 버튼 사이 간격은 최소 16px (PRD 4.2). 선택지는 화면당 최대 4개 (원칙 1) */
export function ButtonStack({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-button-gap">
      {children}
    </div>
  )
}
