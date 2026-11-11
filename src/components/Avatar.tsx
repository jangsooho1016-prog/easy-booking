import type { Doctor } from '../data'

/** 의사 이니셜 아바타 (FR-07: 실제 사진 대신). 이름은 옆에 글자로 따로 쓰므로 읽지 않게 한다 */
export function Avatar({ doctor }: { doctor: Doctor }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-[3.2rem] shrink-0 items-center justify-center rounded-full text-button font-bold text-ink"
      style={{ backgroundColor: doctor.avatarColor }}
    >
      {doctor.name.slice(0, 1)}
    </span>
  )
}
