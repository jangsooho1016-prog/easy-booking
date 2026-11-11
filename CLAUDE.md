# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`PRD.md` is the source of truth. This is a university course project (author: 장수호): a conversational, senior-friendly (65+) same-day clinic booking web app, working title **쉬운예약**. PRD §10 steps 1–7 are all built. The app is deployed at https://easy-booking-coral.vercel.app (Vercel redeploys on every push to `main`). Read `PRD.md` before making changes. When this file and the PRD disagree, the PRD wins.

## Mandatory working rules (PRD §11)

- **Log every user prompt.** After each user prompt, append an entry to `docs/PROMPTS.md` with a sequence number, the date, the prompt text verbatim, and a short summary of what changed. The file is a graded deliverable, so never skip an entry.
- **Build in the PRD §10 order** (steps 1→7). Don't build everything at once. At the end of each step, run the app and check the acceptance scenarios that §10 lists for that step, then move on.
- **No scope creep.** Don't add features the PRD doesn't list: no search, map, payment, sign-up, bottom tab bar, hamburger menu, swipe gestures, auto-advancing screens or timeouts.
- All UI copy is in Korean and follows the copy rules in §4.4: polite form, short sentences, plain words, and button labels that describe the result (e.g. "맞아요", "다시 고를게요" rather than "확인"/"뒤로"). Error messages never blame the user and always say what to do next.
- Use fake data only. No real hospital names, real photos or real personal data. The identity screen always shows "연습용 화면입니다. 실제 개인정보를 입력하지 마세요." and "연습용 번호: 500101".

## Stack and commands

- Port 5173 may be used by another project on this machine. Run the dev server with `npx vite --port 5180`.
- There is no lint or unit test setup. UI rule checks (§4.2 sizes, contrast and horizontal scroll at 360px × 3 font scales) have been done with a throwaway Playwright script driving the installed Chrome (`playwright-core` with `executablePath`). Rerun an equivalent check after layout changes.
- React Router 8 is imported from `react-router`. Tailwind 4 is configured via `@tailwindcss/vite`; there is no `tailwind.config`.

## How the flow is implemented

- `src/state/booking.tsx` holds the in-progress booking as a `Draft`, changed through the pure function `reduce()`. Screens call `reduce(draft, action)` themselves to work out the state after the user's choice, then pass that state to `nextRoute(after, normalNext)`. In normal flow `nextRoute` returns the next screen. In "다시 고를게요" edit mode (`draft.editing`) it jumps to the first missing step, or straight back to `/time/check`. `firstMissing(draft, upTo)` is the single source of truth for which step is still incomplete.
- Each step route in `App.tsx` is wrapped in a `<Guard need={LEVEL.x}>`. If an earlier step is missing, the guard redirects to it, which makes deep links and refreshes safe. Changing the hospital clears only the doctor. A saved slot stays valid only while `isSlotOpen()` says it's still open.
- `useGoBack(fallback)`: "이전으로" calls `navigate(-1)` when `history.state.idx > 0` (React Router's in-app history index, which survives a refresh), and otherwise replaces the current entry with the fallback route.
- **Auto-save (FR-24):** `dispatch` runs `reduce` on a ref and writes the draft to localStorage synchronously, before the re-render. The saved keys are `easy-booking:draft` and `easy-booking:draft-route` (the last flow URL, written by `Guard`). Both keys are removed when the draft is reset.
- **Resume (FR-03, FR-26):** `resumePending` is true on app load when a saved draft exists, and again after "나갈게요".
  - On a flow URL, `Guard` shows `ResumePrompt` in place, without changing the URL, so browser history stays usable after "이어서 할게요".
  - On `/`, `StartPage` shows the same prompt, and `useResume()` re-pushes the canonical history chain up to the saved route (`historyChain()` in `src/lib/flow.ts`), so back still steps one question at a time.
- **Exit confirmation (FR-27):** `StartPage` with a started draft and no pending resume means the user came back to `/` mid-booking, so it asks "정말 나가시겠어요?".
- **Restarting from the in-place prompt** uses `useRewind()`, which goes back to the app's first history entry (`navigate(-idx)`) and then pushes `/` → `/hospital`. That way stale flow entries don't trap the back button. `RewindHandler` must stay mounted inside the router.
- `src/lib/time.ts` contains all date, time and "오늘/내일" logic and formatting. `src/lib/schedule.ts` generates each doctor's open slots, with a deterministic hash deciding which are closed, and finds the fastest doctor. The first doctor at each hospital always keeps 17:30 open.
- **"오늘/내일" rule (scenario 7):** after 17:30, every piece of copy must say "내일" with tomorrow's date. Any text that mentions a slot must go through `formatSlotWithDay()`, `slotParts()` or `dayInfo().word`. Never use `formatSlotTime()` on its own unless a nearby heading already names the day. The only allowed exception is the PRD phrase "오늘 진료는 끝났어요". Korean particles come from `withRo()` and `withEunNeun()`.
- **A saved slot that is no longer valid:** if the slot has passed, or the newly chosen doctor is fully booked at that time, the guard sends the user to `/time`, and that screen's help line says why.
- **Faking the current time for testing:** open any URL with `?now=17:40` (or a full ISO datetime). The time offset is kept in sessionStorage, and `?now=reset` clears it.
- Completed bookings are saved to localStorage under the key `easy-booking:bookings`. Every localStorage access goes through `src/lib/storage.ts`, which adds the `easy-booking:` prefix and wraps calls in try/catch. `DonePage` clears the draft after it mounts. Don't clear the draft before navigating away from `/confirm`, or that screen's guard redirects to `/` first.
- **Settings (FR-30, FR-31):** `src/state/settings.tsx` stores the 글씨 크기 and 소리로 듣기 settings in localStorage under `easy-booking:settings`. `main.tsx` applies the saved font scale before the first render.
  - `ScreenLayout` focuses the `h1` on every screen change, and when 소리로 듣기 is on it calls `say()` with the question. `say()` is a no-op when it's off.
  - `src/lib/speech.ts` wraps `speechSynthesis` (`ko-KR`, rate 0.9). The 소리로 듣기 button is hidden when `speechSupported()` is false.
  - In tests, `speechSynthesis` is faked through `addInitScript` so the test can record what was spoken.
- **Voice input (FR-33):** Screens pass the voice control through `ScreenLayout`'s `voice` prop, which pins it in the sticky footer just above "이전으로" so it sits at the same place on every screen; don't render it in the body. `VoiceAnswer` / `VoiceYesNo` (`src/components/VoiceAnswer.tsx`) render [말로 대답하기] and are hidden when `listenSupported()` is false. Some browsers (Brave) expose the API but fail at once with a `network` error; `listen.ts` then marks recognition as broken, the screen says so, and the button stays hidden until reload. `src/lib/listen.ts` wraps `SpeechRecognition` (one utterance, `ko-KR`); `src/lib/voiceMatch.ts` holds the pure `matchYesNo()` / `matchTime()`. A recognized answer calls the same handler as the button. **Continuous listening:** pressing [말로 대답하기] sets an in-memory flag (`voiceModeOn()` in `listen.ts`, lost on reload); while it is on, every `VoiceAnswer` starts listening on mount and restarts after silence or an answer it cannot use (the message stays on screen). [그만 들을게요], a denied mic, an unavailable browser, or two ends within 1s turn it off. Listening never starts while `isSpeaking()` (소리로 듣기) is true, and pauses while the tab is hidden. Screens still advance only on the user's answer. It is on `/hospital`, `/doctor`, `/time`, `/time/check` and `/identity` only. Final [예약하기] and booking cancel deliberately have no voice input. In tests, fake `window.SpeechRecognition` through `addInitScript`.
- **Measure mode (FR-34):** `?measure=1` turns it on for the tab (sessionStorage), `?measure=0` turns it off. `src/lib/measure.ts` records only while it is on: `beginMeasure()` on the `start` action, `countBack()` in `ScreenLayout`'s "이전으로", `countBirthError()` on a wrong birth date, `finishMeasure(id)` in `completeBooking`. `DonePage` shows the result box. Elapsed time uses the real clock, not `?now`.
- **Flow after the birth date:** `/identity/birth` → `/visit-reason` (FR-20, with `LEVEL.reason`) → `/confirm`. A `visitReason` of `'skip'` means "말하지 않고 넘어갈게요".
- **내 예약:** `/my` and `/my/cancel/:id` sit outside the flow guard. `upcomingBookings()` hides bookings whose time has passed. After a cancel, a one-time `notice` set in the booking context becomes the `/my` heading.
- **Birth-date screen on short viewports:** if the keypad would sit under the pinned "이전으로" bar, `IdentityBirthPage` scrolls just enough to reveal it.
- In e2e tests, React Router updates the URL before the new screen renders. Wait for the new screen's content, not just `waitForURL`.

## Design tokens and size rules (PRD §4.2)

All tokens live in `src/styles/index.css` inside Tailwind's `@theme` block, which generates utilities such as `text-question`, `min-h-button`, `gap-button-gap`, `size-key` and `bg-primary`. Sizes are in `rem`, and the font-size setting only changes the root size through `<html data-font-scale="normal|large|xlarge">` (20/23/26px), so everything scales together. Don't hard-code px font sizes or colors in components. Shared UI lives in `src/components/` (`ScreenLayout`, `BigButton`, `ButtonStack`, `Progress`, `ScreenTools`). Every screen must render inside `ScreenLayout`. Required minimums:

- Body text 20px; question text 28px bold; button text 22px.
- Buttons at least 64px tall, full width, with at least 16px between them; keypad keys at least 72×72px.
- Contrast of 7:1 for text (4.5:1 at the very least); line height of 1.5 or more.

Use one calm primary color (deep teal or deep blue). Red is only for actions that are hard to undo, like cancelling a booking, and always comes with text. Never convey meaning through color or icon alone. The layout is mobile-first, works from 360px wide, and is centered at a maximum of 480px on desktop. At "아주 크게" there must be no horizontal scroll and no clipped buttons. Every control needs an accessible name, and the whole flow must work with the keyboard alone.

## Verification

PRD §9 lists 11 acceptance scenarios. They are the definition of done, so check the relevant ones by actually running the app after each step.
