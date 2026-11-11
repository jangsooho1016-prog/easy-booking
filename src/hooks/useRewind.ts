import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router'
import { historyIndex } from '../lib/history'

/**
 * 처음부터 다시 할 때 쓰는 "기록 되감기".
 * 새로고침 뒤 [처음부터 할게요]를 누르면 브라우저에는 지난 흐름의 기록이 남아 있어,
 * 뒤로 가기를 누를 때마다 지난 화면들을 거치게 된다.
 * 그래서 이 앱의 첫 기록까지 되돌아간 다음 새로 쌓는다.
 */
let pending: ((navigate: NavigateFunction) => void) | null = null

export function useRewind() {
  const navigate = useNavigate()
  return useCallback(
    (then: (navigate: NavigateFunction) => void) => {
      const idx = historyIndex()
      if (idx > 0) {
        pending = then
        navigate(-idx)
      } else {
        then(navigate)
      }
    },
    [navigate],
  )
}

/** 되감기가 끝나 첫 기록에 도착하면 이어서 할 이동을 실행한다. 라우터 안에 한 번만 둔다 */
export function RewindHandler() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (pending && historyIndex() === 0) {
      const then = pending
      pending = null
      then(navigate)
    }
  }, [location, navigate])
  return null
}
