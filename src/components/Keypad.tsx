import { useEffect, useRef } from 'react'

type KeypadProps = {
  value: string
  maxLength: number
  onChange: (value: string) => void
}

/**
 * 화면에 직접 그린 큰 숫자 키패드 (FR-16).
 * 입력 칸(<input>)을 쓰지 않으므로 기기 키보드가 뜨지 않는다.
 * 실물 키보드의 숫자·Backspace·Delete도 받아 키보드만으로 진행할 수 있다 (FR-32).
 */
export function Keypad({ value, maxLength, onChange }: KeypadProps) {
  const press = (digit: string) => {
    if (value.length < maxLength) onChange(value + digit)
  }
  const removeOne = () => onChange(value.slice(0, -1))
  const removeAll = () => onChange('')

  // 최신 함수를 키보드 이벤트에서 쓰기 위해 ref에 담아 둔다
  const handlers = useRef({ press, removeOne, removeAll })
  handlers.current = { press, removeOne, removeAll }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (/^[0-9]$/.test(e.key)) handlers.current.press(e.key)
      else if (e.key === 'Backspace') handlers.current.removeOne()
      else if (e.key === 'Delete') handlers.current.removeAll()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 키 너비는 3칸 격자가 정한다 (360px 화면에서도 72px 이상)
  const key =
    'flex min-h-key items-center justify-center rounded-button px-1 font-semibold active:translate-y-px'
  const digitKey = `${key} border-[3px] border-primary bg-surface text-[1.4rem] text-ink active:bg-canvas`
  // "하나 지우기"는 좁은 키 안에 들어가야 하므로 버튼 최소 글씨(22px)와 본문 크기 중 큰 값을 쓴다
  const editKey = `${key} border-[3px] border-ink-muted bg-canvas text-[max(22px,1rem)] leading-[1.52] text-ink active:bg-surface`

  return (
    <div role="group" aria-label="숫자 키패드" className="grid grid-cols-3 gap-1.5">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className={digitKey} onClick={() => press(d)}>
          {d}
        </button>
      ))}
      <button type="button" className={editKey} onClick={removeOne}>
        하나 지우기
      </button>
      <button type="button" className={digitKey} onClick={() => press('0')}>
        0
      </button>
      <button type="button" className={editKey} onClick={removeAll}>
        모두 지우기
      </button>
    </div>
  )
}

/** 누른 숫자를 큰 칸 6개에 하나씩 보여 준다. 가리지 않는다 (FR-17) */
export function DigitBoxes({ value, length }: { value: string; length: number }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      aria-label={value ? `누른 번호 ${value.split('').join(' ')}` : '아직 누른 번호가 없어요'}
      role="status"
    >
      {Array.from({ length }, (_, i) => {
        const filled = i < value.length
        const current = i === value.length
        return (
          <span
            key={i}
            aria-hidden="true"
            className={
              'flex h-[2.6rem] items-center justify-center rounded-[0.5rem] border-[3px] ' +
              'text-emphasis font-bold text-ink ' +
              (current ? 'border-primary' : filled ? 'border-ink-muted' : 'border-line')
            }
          >
            {value[i] ?? ''}
          </span>
        )
      })}
    </div>
  )
}
