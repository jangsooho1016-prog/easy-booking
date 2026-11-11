import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useRewind } from '../hooks/useRewind'
import { firstMissing, saveDraftRoute, useBooking, type Level } from '../state/booking'
import { ResumePrompt } from './ResumePrompt'

/**
 * 흐름 화면을 감싼다.
 * 1. 새로고침·다시 열기로 저장된 예약이 있으면 이 주소 그대로 "이어서 할까요?"를 먼저 묻는다 (FR-26).
 *    [이어서 할게요]를 누르면 같은 화면이 나오고, 브라우저 기록도 그대로 쓸 수 있다.
 * 2. 앞 단계가 비어 있으면(직접 접속 등) 아직 고르지 않은 첫 화면으로 보낸다.
 * 3. 지금 화면 주소를 저장해 두어 다음에 이어서 할 곳으로 쓴다.
 */
export function Guard({ need, children }: { need: Level; children: ReactNode }) {
  const { draft, dispatch, resumePending, setResumePending } = useBooking()
  const location = useLocation()
  const rewind = useRewind()
  const missing = firstMissing(draft, need)
  const showing = !resumePending && !missing

  useEffect(() => {
    if (showing) saveDraftRoute(location.pathname + location.search)
  }, [showing, location.pathname, location.search])

  if (resumePending && draft.started) {
    return (
      <ResumePrompt
        draft={draft}
        onContinue={() => setResumePending(false)}
        onRestart={() => {
          setResumePending(false)
          dispatch({ type: 'start' })
          // 지난 흐름의 기록을 되감고 시작 → 병원 확인 순서로 새로 쌓는다
          rewind((navigate) => {
            navigate('/', { replace: true })
            navigate('/hospital')
          })
        }}
      />
    )
  }
  if (missing) return <Navigate to={missing} replace />
  return children
}
