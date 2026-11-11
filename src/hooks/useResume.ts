import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { historyChain, isFlowPath } from '../lib/flow'
import { firstMissing, loadDraftRoute, useBooking } from '../state/booking'

/**
 * 시작 화면에서 "이어서 할게요" / "계속 예약할게요"를 누르면
 * 마지막으로 보던 화면까지 흐름 순서대로 기록을 쌓으며 이동한다.
 * (앞 단계가 비어 있으면 Guard가 알아서 그 단계로 보낸다)
 */
export function useResume() {
  const navigate = useNavigate()
  const { draft, setResumePending } = useBooking()

  return useCallback(() => {
    setResumePending(false)
    const saved = loadDraftRoute()
    const target =
      saved && isFlowPath(saved.split('?')[0]) ? saved : (firstMissing(draft) ?? '/confirm')
    for (const path of historyChain(draft, target)) navigate(path)
  }, [navigate, draft, setResumePending])
}
