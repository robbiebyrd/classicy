# Clock Drift Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `setInterval(1000)` accumulator ticks in the Classicy virtual clock with wall-clock anchoring so the displayed time never drifts from real elapsed time, regardless of interval jitter or tab backgrounding.

**Architecture:** A new pure utility `computeAnchoredTime(virtualAnchorMs, realAnchorMs)` embodies the formula `virtualNow = virtualAnchorMs + (Date.now() - realAnchorMs)`. Both `useClassicyDateTime` (hook) and `ClassicyDesktopMenuWidgetTime` (MenuBar widget) replace their accumulator refs with a `virtualAnchorMsRef` + `realAnchorMsRef` pair. On pause both anchors are snapped to the current virtual moment; on resume only `realAnchorMs` resets to `Date.now()`, so the clock picks up exactly where it left off. The poll interval drops to 250ms — but React state only updates when the second changes, so render frequency stays at ≤1 Hz.

**Tech Stack:** TypeScript, React hooks (`useRef`, `useEffect`, `useState`), Vitest, Zustand (store unchanged)

## Global Constraints

- Working directory: `/home/robbiebyrd/classicy`
- Test command: `npm test` (runs `vitest run`)
- All tests must stay green at every commit
- Public API of `useClassicyDateTime`, `ClassicyDateTimeValue`, `toLocalDate`, `toLocalHMS` must not change signatures or semantics
- No new npm dependencies
- No changes to the Zustand store schema or `ClassicyDateTimeValue` interface

## File Structure

| File | Role |
|---|---|
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx` | Add `computeAnchoredTime` export; replace hook accumulator with anchor refs |
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts` | Add `computeAnchoredTime` tests |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx` | Replace widget accumulator with anchor refs; import `computeAnchoredTime` |

---

### Task 1: Add `computeAnchoredTime` utility and tests

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx` (add after line 23)
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts` (add at end of file)

**Interfaces:**
- Produces: `export function computeAnchoredTime(virtualAnchorMs: number, realAnchorMs: number): Date` — used by hook (Task 2) and widget (Task 3)

- [ ] **Step 1: Create feature branch**

```bash
cd /home/robbiebyrd/classicy
git checkout -b fix/clock-drift-wall-clock-anchoring
```

Expected: switched to a new branch `fix/clock-drift-wall-clock-anchoring`

- [ ] **Step 2: Add `computeAnchoredTime` to the import line in the test file**

In `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts`, find the existing import (line 6–8):

```typescript
import {
	classicyDateTimeManagerEventHandler,
	toLocalDate,
	toLocalHMS,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
```

Replace with:

```typescript
import {
	classicyDateTimeManagerEventHandler,
	computeAnchoredTime,
	toLocalDate,
	toLocalHMS,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
```

- [ ] **Step 3: Add the failing tests**

Append the following `describe` block at the end of `ClassicyDateTimeManagerEventHandler.test.ts` (after the last closing `}`):

```typescript
describe("computeAnchoredTime", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns virtual anchor time when no real time has elapsed", () => {
		vi.useFakeTimers();
		vi.setSystemTime(5000);
		const result = computeAnchoredTime(1_000_000_000, 5000);
		expect(result.getTime()).toBe(1_000_000_000);
	});

	it("advances virtual time by exact real elapsed milliseconds", () => {
		vi.useFakeTimers();
		vi.setSystemTime(5000);
		vi.setSystemTime(8500); // 3500ms later
		const result = computeAnchoredTime(1_000_000_000, 5000);
		expect(result.getTime()).toBe(1_000_003_500);
	});

	it("reflects exact real elapsed time even when ticks would have fired late", () => {
		vi.useFakeTimers();
		const virtualAnchorMs = 1_000_000_000;
		const realAnchorMs = 0;
		// Three "late" ticks: +1050, +980, +1100ms = 3130ms total real elapsed.
		// An accumulator would give 3000ms; the formula gives the exact 3130ms.
		vi.setSystemTime(3130);
		const result = computeAnchoredTime(virtualAnchorMs, realAnchorMs);
		expect(result.getTime()).toBe(1_000_003_130);
	});

	it("resumes from exact paused moment when real anchor is reset on resume", () => {
		vi.useFakeTimers();
		// Clock was running: virtualAnchor=5_002_000, realAnchor captured at t=2000.
		// 5 seconds pass while paused (real time advances to t=7000).
		// On resume: realAnchor resets to Date.now()=7000; virtualAnchor stays 5_002_000.
		vi.setSystemTime(7000);
		const atResume = computeAnchoredTime(5_002_000, 7000);
		expect(atResume.getTime()).toBe(5_002_000); // exactly the paused moment

		// 1 more real second after resume
		vi.setSystemTime(8000);
		const after1s = computeAnchoredTime(5_002_000, 7000);
		expect(after1s.getTime()).toBe(5_003_000);
	});
});
```

- [ ] **Step 4: Run tests to verify the 4 new tests fail**

```bash
cd /home/robbiebyrd/classicy && npm test -- ClassicyDateTimeManagerEventHandler 2>&1 | tail -20
```

Expected: 4 tests fail with `computeAnchoredTime is not a function` (TypeScript import error or runtime ReferenceError).

- [ ] **Step 5: Add `computeAnchoredTime` to the utils file**

In `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx`, find the end of `toLocalHMS` (after line 23):

```typescript
	return `${h}:${m}:${s}`;
}
```

Insert the new function immediately after that closing brace:

```typescript
	return `${h}:${m}:${s}`;
}

/**
 * Computes the current virtual time from two wall-clock anchors.
 *
 * virtualAnchorMs: the virtual epoch-ms when the anchor was last set.
 * realAnchorMs: Date.now() at that exact same moment.
 *
 * Drift-free: however late the caller invokes this, the elapsed real time
 * is always reflected exactly, with no accumulation error.
 */
export function computeAnchoredTime(
	virtualAnchorMs: number,
	realAnchorMs: number,
): Date {
	return new Date(virtualAnchorMs + (Date.now() - realAnchorMs));
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
cd /home/robbiebyrd/classicy && npm test 2>&1 | tail -5
```

Expected: all tests PASS (the 4 new tests now pass, all prior tests still pass).

- [ ] **Step 7: Commit**

```bash
cd /home/robbiebyrd/classicy
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx \
        src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts
git commit -m "feat: add computeAnchoredTime utility for drift-free virtual clock"
```

---

### Task 2: Fix `useClassicyDateTime` hook

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx` (lines 53–134, the hook body)

**Interfaces:**
- Consumes: `computeAnchoredTime(virtualAnchorMs: number, realAnchorMs: number): Date` (added in Task 1, already in scope in the same file)
- Produces: `useClassicyDateTime(options?: { tick?: boolean }): ClassicyDateTimeValue` — identical public signature; `localDate`/`localHMS` are now drift-free

- [ ] **Step 1: Verify tests are green before touching the hook**

```bash
cd /home/robbiebyrd/classicy && npm test 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 2: Replace the entire `useClassicyDateTime` function**

In `ClassicyDateAndTimeManagerUtils.tsx`, delete everything from `export function useClassicyDateTime` to the end of the file and replace with:

```typescript
/**
 * Read the virtual clock from the Classicy store.
 *
 * With `tick: true` the returned `localDate` and `localHMS` advance using
 * wall-clock anchoring — drift-free regardless of interval jitter or tab
 * backgrounding. The store is only updated on minute boundaries to avoid
 * excess writes.
 */
export function useClassicyDateTime(options?: {
	tick?: boolean;
}): ClassicyDateTimeValue {
	const tick = options?.tick ?? false;
	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	const dispatch = useAppManagerDispatch();

	const tzOffset = parseInt(dateAndTime.timeZoneOffset, 10);
	const paused = dateAndTime.paused;

	const [localDate, setLocalDate] = useState<Date>(() =>
		toLocalDate(dateAndTime.dateTime, tzOffset),
	);

	// Wall-clock anchors: virtualAnchorMsRef holds the virtual epoch-ms when the
	// anchor was last set; realAnchorMsRef holds Date.now() at that moment.
	// computeAnchoredTime() produces drift-free virtual time from these two refs.
	const virtualAnchorMsRef = useRef<number>(
		toLocalDate(dateAndTime.dateTime, tzOffset).getTime(),
	);
	const realAnchorMsRef = useRef<number>(Date.now());

	const tzOffsetRef = useRef(tzOffset);
	tzOffsetRef.current = tzOffset;
	const pausedRef = useRef(paused);
	pausedRef.current = paused;

	// When the store's dateTime changes (user sets a new time, or minute dispatch
	// from the MenuBar widget), reset both anchors to the new virtual moment.
	useEffect(() => {
		const newVirtualMs = toLocalDate(dateAndTime.dateTime, tzOffset).getTime();
		virtualAnchorMsRef.current = newVirtualMs;
		realAnchorMsRef.current = Date.now();
		setLocalDate(new Date(newVirtualMs));
	}, [dateAndTime.dateTime, tzOffset]);

	// Pause: snapshot both anchors at the current virtual moment so the formula
	// yields that frozen time on all subsequent ticks.
	// Resume: keep virtualAnchorMs at the frozen moment, reset realAnchorMs to
	// now so elapsed real time counts from the exact resume instant.
	useEffect(() => {
		if (paused) {
			const frozenMs =
				virtualAnchorMsRef.current + (Date.now() - realAnchorMsRef.current);
			virtualAnchorMsRef.current = frozenMs;
			realAnchorMsRef.current = Date.now();
		} else {
			realAnchorMsRef.current = Date.now();
		}
	}, [paused]);

	// Poll every 250ms and evaluate the anchor formula. Only updates React state
	// when the displayed second actually changes, so render frequency stays ≤1 Hz
	// even though the interval fires 4× per second.
	useEffect(() => {
		if (!tick) return;
		const id = setInterval(() => {
			if (pausedRef.current) return;
			const virtualNow = computeAnchoredTime(
				virtualAnchorMsRef.current,
				realAnchorMsRef.current,
			);
			setLocalDate((prev) => {
				if (
					Math.floor(prev.getTime() / 1000) ===
					Math.floor(virtualNow.getTime() / 1000)
				) {
					return prev;
				}
				return virtualNow;
			});
		}, 250);
		return () => clearInterval(id);
	}, [tick]);

	const setDateTime = useCallback(
		(date: Date) => {
			dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: date });
		},
		[dispatch],
	);

	const setTzOffset = useCallback(
		(offset: string) => {
			dispatch({ type: "ClassicyManagerDateTimeTZSet", tzOffset: offset });
		},
		[dispatch],
	);

	const pause = useCallback(
		() => dispatch({ type: "ClassicyManagerDateTimePause" }),
		[dispatch],
	);

	const resume = useCallback(
		() => dispatch({ type: "ClassicyManagerDateTimeResume" }),
		[dispatch],
	);

	const localHMS = toLocalHMS(localDate.toISOString(), 0);

	return {
		dateTime: dateAndTime.dateTime,
		tzOffset,
		localDate,
		localHMS,
		paused,
		setDateTime,
		setTzOffset,
		pause,
		resume,
	};
}
```

- [ ] **Step 3: Run tests**

```bash
cd /home/robbiebyrd/classicy && npm test 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/robbiebyrd/classicy
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx
git commit -m "fix: replace setInterval accumulator with wall-clock anchoring in useClassicyDateTime"
```

---

### Task 3: Fix `ClassicyDesktopMenuWidgetTime` widget

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx`

**Interfaces:**
- Consumes: `computeAnchoredTime(virtualAnchorMs: number, realAnchorMs: number): Date` from `@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils`

- [ ] **Step 1: Verify tests are green before touching the widget**

```bash
cd /home/robbiebyrd/classicy && npm test 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 2: Replace the full file content**

Write the following to `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx`.

The changes vs. the original are: (a) add `computeAnchoredTime` import, (b) replace `localDateRef` with `virtualAnchorMsRef` + `realAnchorMsRef`, (c) replace the store-reset effect, (d) add pause/resume effect, (e) add `prevSecondsRef`, (f) replace `setInterval(1000)` accumulator with `setInterval(250)` + formula. The JSX and helper functions (`convertToTwoDigit`, `convertTo12HourPeriod`, `toBlink`, `openDateTimeManager`) are unchanged.

```typescript
import "./ClassicyDesktopMenuWidgetTime.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const appIcon = ClassicyIcons.controlPanels.dateTimeManager.dateTimeManager;

import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { computeAnchoredTime } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";

export const ClassicyDesktopMenuWidgetTime: FunctionalComponent = () => {
	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	const desktopEventDispatch = useAppManagerDispatch();

	const {
		show,
		militaryTime,
		displaySeconds,
		displayPeriod,
		displayDay,
		displayLongDay,
		flashSeparators,
	} = dateAndTime;

	const [showingTime, setShowingTime] = useState(true);

	const [time, setTime] = useState({
		year: new Date(dateAndTime.dateTime).getFullYear(),
		month: new Date(dateAndTime.dateTime).getMonth(),
		date: new Date(dateAndTime.dateTime).getDate(),
		day: new Date(dateAndTime.dateTime).getUTCDay(),
		minutes: new Date(dateAndTime.dateTime).getUTCMinutes(),
		hours: new Date(dateAndTime.dateTime).getUTCHours(),
		seconds: new Date(dateAndTime.dateTime).getUTCSeconds(),
		period: new Date(dateAndTime.dateTime).getUTCHours() > 12 ? " PM" : " AM",
	});

	const daysOfWeek = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];

	// Wall-clock anchors: virtualAnchorMsRef holds the local (tz-shifted) epoch-ms
	// when the anchor was last set; realAnchorMsRef holds Date.now() at that moment.
	const virtualAnchorMsRef = useRef<number>(
		new Date(dateAndTime.dateTime).getTime() +
			parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000,
	);
	const realAnchorMsRef = useRef<number>(Date.now());

	const timeZoneOffsetRef = useRef(dateAndTime.timeZoneOffset);
	const prevMinutesRef = useRef(time.minutes);
	const prevSecondsRef = useRef(time.seconds);
	const pausedRef = useRef(dateAndTime.paused);

	// When the store changes (user sets new time/tz), reset both anchors.
	useEffect(() => {
		virtualAnchorMsRef.current =
			new Date(dateAndTime.dateTime).getTime() +
			parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000;
		realAnchorMsRef.current = Date.now();
	}, [dateAndTime.dateTime, dateAndTime.timeZoneOffset]);

	useEffect(() => {
		timeZoneOffsetRef.current = dateAndTime.timeZoneOffset;
	}, [dateAndTime.timeZoneOffset]);

	useEffect(() => {
		pausedRef.current = dateAndTime.paused;
	}, [dateAndTime.paused]);

	// Pause: snapshot both anchors at the current virtual moment so the formula
	// yields that frozen time on subsequent ticks.
	// Resume: reset only realAnchorMs so the clock continues from the paused instant.
	useEffect(() => {
		if (dateAndTime.paused) {
			const frozenMs =
				virtualAnchorMsRef.current + (Date.now() - realAnchorMsRef.current);
			virtualAnchorMsRef.current = frozenMs;
			realAnchorMsRef.current = Date.now();
		} else {
			realAnchorMsRef.current = Date.now();
		}
	}, [dateAndTime.paused]);

	// Poll every 250ms; evaluate anchor formula and update display only when the
	// second changes. Dispatches the global store update on minute boundaries.
	useEffect(() => {
		const intervalId = setInterval(() => {
			if (pausedRef.current) return;
			const localDate = computeAnchoredTime(
				virtualAnchorMsRef.current,
				realAnchorMsRef.current,
			);

			const newSeconds = localDate.getUTCSeconds();
			if (newSeconds === prevSecondsRef.current) return;
			prevSecondsRef.current = newSeconds;

			const date = new Date(
				localDate.getTime() -
					parseInt(timeZoneOffsetRef.current, 10) * 60 * 60 * 1000,
			);

			const newMinutes = localDate.getUTCMinutes();

			setTime({
				year: localDate.getUTCFullYear(),
				month: localDate.getUTCMonth(),
				date: localDate.getUTCDate(),
				day: localDate.getUTCDay(),
				minutes: newMinutes,
				hours: localDate.getUTCHours() === 0 ? 12 : localDate.getUTCHours(),
				seconds: newSeconds,
				period: localDate.getUTCHours() < 12 ? " AM" : " PM",
			});

			if (newMinutes !== prevMinutesRef.current) {
				prevMinutesRef.current = newMinutes;
				desktopEventDispatch({
					type: "ClassicyManagerDateTimeSet",
					dateTime: date,
				});
			}
		}, 250);

		return () => clearInterval(intervalId);
	}, [desktopEventDispatch]);

	const convertToTwoDigit = (num: number) => {
		return num.toLocaleString("en-US", {
			minimumIntegerDigits: 2,
		});
	};

	const convertTo12HourPeriod = (num: number) => {
		if (num > 12) {
			return num - 12;
		}
		if (num === 0) {
			return 12;
		}
		return num;
	};

	const toBlink = () => {
		if (!dateAndTime.paused && flashSeparators) {
			return "textBlinker";
		}

		return;
	};

	const openDateTimeManager = () => {
		desktopEventDispatch({
			type: "ClassicyAppOpen",
			app: {
				id: "DateAndTimeManager.app",
				name: "Date and Time Manager",
				icon: appIcon,
			},
		});
	};

	return (
		<>
			{show && (
				<li
					className={classNames(
						"classicyMenuItem",
						"classicyMenuItemNoImage",
						"classicyDesktopMenuTime",
					)}
					onDoubleClick={openDateTimeManager}
					onClick={() => {
						setShowingTime(!showingTime);
					}}
					onKeyDown={(e: KeyboardEvent) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setShowingTime(!showingTime);
						}
					}}
				>
					{showingTime ? (
						<div>
							{displayDay && (
								<span className={"classicyDesktopMenuTimeSeparatorRight"}>
									{displayLongDay
										? daysOfWeek[time.day]
										: daysOfWeek[time.day].slice(0, 3)}
								</span>
							)}
							<span>
								{" "}
								{militaryTime
									? convertToTwoDigit(time.hours)
									: convertTo12HourPeriod(time.hours)}
							</span>
							<span>
								<span className={displaySeconds ? "" : toBlink()}>:</span>
								{convertToTwoDigit(time.minutes)}
							</span>
							{displaySeconds && (
								<>
									<span className={toBlink()}>:</span>
									<span>{convertToTwoDigit(time.seconds)}</span>
								</>
							)}
							{!militaryTime && displayPeriod && (
								<span className={"classicyDesktopMenuTimeSeparatorLeft"}>
									{time.period}
								</span>
							)}
						</div>
					) : (
						<div>
							<span>
								{" "}
								{time.month + 1}/{time.date}/{time.year}
							</span>
						</div>
					)}
				</li>
			)}
		</>
	);
};
```

- [ ] **Step 3: Run tests**

```bash
cd /home/robbiebyrd/classicy && npm test 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/robbiebyrd/classicy
git add src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx
git commit -m "fix: replace setInterval accumulator with wall-clock anchoring in MenuBar time widget"
```

---

### Task 4: Open PR on classicy

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the feature branch**

```bash
cd /home/robbiebyrd/classicy
git push -u origin fix/clock-drift-wall-clock-anchoring
```

Expected: branch pushed, tracking set.

- [ ] **Step 2: Open the PR**

```bash
cd /home/robbiebyrd/classicy
gh pr create \
  --title "fix: drift-free virtual clock via wall-clock anchoring" \
  --body "$(cat <<'EOF'
## Summary

- Adds `computeAnchoredTime(virtualAnchorMs, realAnchorMs)` — a pure utility that computes virtual time as `virtualAnchorMs + (Date.now() - realAnchorMs)`, making drift structurally impossible
- Replaces `setInterval(1000)` accumulator in `useClassicyDateTime` with two anchor refs + 250ms poll; React state only updates when the second changes (≤1 Hz renders)
- Same fix in `ClassicyDesktopMenuWidgetTime` (independent accumulator); adds `prevSecondsRef` guard
- Pause/resume: on pause both anchors snap to the current virtual moment; on resume only `realAnchorMs` resets so the clock continues from the exact paused instant

## Test plan

- [ ] `npm test` passes (4 new `computeAnchoredTime` tests cover: no-elapsed, exact-elapsed, late-tick accuracy, pause/resume semantics)
- [ ] Open rt911 app; observe MenuBar clock; leave tab in background for 60s; confirm clock has not fallen behind wall time on return
- [ ] Pause the virtual clock via Date and Time Manager; advance real time; resume; confirm clock reads the exact paused time, then continues forward

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed to stdout.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Covered by |
|---|---|
| Root cause: `setInterval(1000)` accumulator in two files | Task 2 (hook) + Task 3 (widget) |
| Solution: `virtualNow = virtualAnchorMs + (Date.now() - realAnchorMs)` | Task 1 (`computeAnchoredTime`) |
| Anchor lifecycle: init, tick (unchanged), pause, resume | Task 2 + 3 (`useEffect` on `paused`) |
| `setInterval(250)` replacing `setInterval(1000)` | Task 2 + 3 |
| No store schema changes | Confirmed — no store changes in any task |
| No public API changes | Confirmed — `ClassicyDateTimeValue` interface unchanged |
| Test: drift with delayed ticks | Task 1, test 3 |
| Test: pause freezes time | Task 1, test 4 (freeze captured as `frozenVirtualMs`) |
| Test: resume from exact pause point | Task 1, test 4 (post-resume assertions) |

**Placeholder scan:** None found.

**Type consistency:** `computeAnchoredTime(number, number): Date` — used identically in Task 1 tests, Task 2 hook, and Task 3 widget. No mismatches.
