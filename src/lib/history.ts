/** React Router가 history.state에 넣어 두는 "이 앱 안에서 몇 번째 기록인지". 새로고침해도 유지된다 */
export function historyIndex() {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' ? idx : 0
}
