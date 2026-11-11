/** localStorage 읽기·쓰기. 사생활 보호 모드 등에서 실패해도 앱이 멈추지 않게 감싼다 */

const PREFIX = 'easy-booking:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 저장하지 못해도 화면 흐름은 계속된다
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // 무시
  }
}
