import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { historyIndex } from '../lib/history'

/**
 * "← 이전으로" = 브라우저 뒤로 가기 (FR-25).
 * 앱 안의 앞 기록이 있으면(새로고침 뒤에도 유지됨) history를 한 칸 되돌린다.
 * 주소로 바로 들어와 앞 기록이 없으면 흐름상 바로 앞 화면으로 바꿔 간다.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    if (historyIndex() > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
