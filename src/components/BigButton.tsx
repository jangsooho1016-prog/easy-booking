import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

type BigButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** primary = 채운 색(주 버튼), secondary = 테두리(보조 버튼), danger = 되돌리기 어려운 행동 */
  variant?: Variant
  /** 버튼의 주 문구. 행동의 결과가 드러나게 쓴다 (예: "맞아요", "다시 고를게요") */
  children: ReactNode
  /** 둘째 줄 설명 (병원 카드의 진료 과목·동네 등). 있으면 글자를 왼쪽 정렬한다 */
  description?: ReactNode
  /** 앞 단계에서 이미 고른 선택지. 색만이 아니라 "고른 것" 글자로도 표시한다 (FR-25, 원칙 5) */
  selected?: boolean
  /** 글자 왼쪽에 놓을 그림 (의사 아바타 등) */
  leading?: ReactNode
}

const base =
  'relative flex w-full min-h-button flex-col justify-center rounded-button px-5 py-3 ' +
  'text-button font-semibold transition-[background-color,transform] duration-100 ' +
  'active:translate-y-px disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-surface active:bg-primary-pressed',
  secondary: 'border-[3px] border-primary bg-surface text-primary active:bg-canvas',
  danger: 'bg-danger text-surface active:bg-danger-pressed',
}

export function BigButton({
  variant = 'primary',
  description,
  selected = false,
  leading,
  className = '',
  children,
  type = 'button',
  ...rest
}: BigButtonProps) {
  const align = description || leading ? 'items-start text-left' : 'items-center text-center'
  // 고른 것은 테두리를 더 두껍게 (같은 속성 클래스 두 개가 겹치지 않도록 바꿔 끼운다)
  const look = selected
    ? `${variants[variant].replace('border-[3px]', '')} border-[5px] border-primary`
    : variants[variant]

  return (
    <button
      type={type}
      aria-pressed={rest['aria-pressed'] ?? (selected || undefined)}
      className={`${base} ${look} ${align} ${className}`}
      {...rest}
    >
      {selected && (
        <span
          className={
            'mb-1 inline-flex items-center gap-1 rounded-full px-3 text-body font-bold ' +
            (variant === 'secondary' ? 'bg-primary text-surface' : 'bg-surface text-primary')
          }
        >
          <span aria-hidden="true">✓</span> 고른 것
        </span>
      )}
      {/* 그림은 주 문구 옆에만 두고, 설명은 아래 줄에 전체 폭으로 쓴다 (큰 글씨에서도 덜 꺾이게) */}
      <span className={leading ? 'flex items-center gap-3' : 'contents'}>
        {leading}
        <span className="min-w-0">{children}</span>
      </span>
      {description && (
        <span
          className={'mt-1 text-body font-normal ' + (variant === 'secondary' ? 'text-ink-muted' : 'text-surface')}
        >
          {description}
        </span>
      )}
    </button>
  )
}
