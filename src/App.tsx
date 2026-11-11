import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Guard } from './components/Guard'
import { RewindHandler } from './hooks/useRewind'
import { DoctorChoosePage, DoctorConfirmPage } from './pages/DoctorPages'
import { DonePage, FinalConfirmPage } from './pages/FinishPages'
import { HospitalChoosePage, HospitalConfirmPage } from './pages/HospitalPages'
import { IdentityBirthPage, IdentityNamePage, IdentityOtherPage } from './pages/IdentityPages'
import { CancelBookingPage, MyBookingsPage } from './pages/MyBookingsPages'
import { StartPage } from './pages/StartPage'
import { TimeChangePage, TimeCheckPage, TimeSelectPage } from './pages/TimePages'
import { VisitReasonPage } from './pages/VisitReasonPage'
import { BookingProvider, LEVEL } from './state/booking'
import { SettingsProvider } from './state/settings'

/**
 * 화면 흐름 (PRD 5장). 질문 하나 = 경로 하나라서 브라우저 뒤로 가기가 "이전으로"와 같다.
 * Guard의 need = 그 화면을 보기 전에 골라져 있어야 하는 단계.
 */
const FLOW = [
  { path: '/hospital', need: LEVEL.started, element: <HospitalConfirmPage /> },
  { path: '/hospital/choose', need: LEVEL.started, element: <HospitalChoosePage /> },
  { path: '/doctor', need: LEVEL.hospital, element: <DoctorConfirmPage /> },
  { path: '/doctor/choose', need: LEVEL.hospital, element: <DoctorChoosePage /> },
  { path: '/time', need: LEVEL.doctor, element: <TimeSelectPage /> },
  { path: '/time/check', need: LEVEL.slot, element: <TimeCheckPage /> },
  { path: '/time/change', need: LEVEL.slot, element: <TimeChangePage /> },
  { path: '/identity', need: LEVEL.slot, element: <IdentityNamePage /> },
  { path: '/identity/other', need: LEVEL.slot, element: <IdentityOtherPage /> },
  { path: '/identity/birth', need: LEVEL.name, element: <IdentityBirthPage /> },
  { path: '/visit-reason', need: LEVEL.birth, element: <VisitReasonPage /> },
  { path: '/confirm', need: LEVEL.reason, element: <FinalConfirmPage /> },
]

export function App() {
  return (
    <SettingsProvider>
      <BookingProvider>
        <BrowserRouter>
          <RewindHandler />
          <Routes>
            <Route path="/" element={<StartPage />} />
            {FLOW.map(({ path, need, element }) => (
              <Route key={path} path={path} element={<Guard need={need}>{element}</Guard>} />
            ))}
            <Route path="/done/:id" element={<DonePage />} />
            <Route path="/my" element={<MyBookingsPage />} />
            <Route path="/my/cancel/:id" element={<CancelBookingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </SettingsProvider>
  )
}
