# DateTime Boundary Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add developer-configurable `minDateTime`/`maxDateTime` bounds to the Classicy clock: the clock locks at `maxDateTime`, resets to `minDateTime` if out of range, and both pickers in DateAndTimeManager enforce the same limits.

**Architecture:** Bounds live in the Zustand store as nullable ISO strings set via `defaultState`. The event handler enforces bounds on every `ClassicyManagerDateTimeSet` and gates `ClassicyManagerDateTimeResume` when locked. The `useClassicyDateTime` hook tick checks bounds and dispatches corrections. The DateAndTimeManager reads bounds from state and passes them as `minValue`/`maxValue` props to both pickers.

**Tech Stack:** TypeScript, React, Zustand, Vitest, @testing-library/react

## Global Constraints

- All ISO strings in the store are UTC (`new Date().toISOString()` format)
- `boundaryLocked` is orthogonal to `paused`: both can be true simultaneously; `ClassicyManagerDateTimeResume` is a no-op while `boundaryLocked` is true
- Boundary condition: `value >= maxDateTime` triggers lock; `value < minDateTime` resets to min
- Run tests with: `pnpm test`
- Lint with: `pnpm lint`

---

### Task 1: Extend state interface and default state

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (interface + default state)
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts` (`makeStore` helper)

**Interfaces:**
- Produces: `ClassicyStoreSystemDateAndTimeManager` gains `minDateTime: string | null`, `maxDateTime: string | null`, `boundaryLocked: boolean` — all downstream tasks depend on this shape

- [ ] **Step 1: Add three fields to `ClassicyStoreSystemDateAndTimeManager`**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, replace the interface:

```typescript
export interface ClassicyStoreSystemDateAndTimeManager
	extends ClassicyStoreSystemManager {
	dateTime: string;
	timeZoneOffset: string;
	militaryTime: boolean;
	displaySeconds: boolean;
	displayPeriod: boolean;
	displayDay: boolean;
	displayLongDay: boolean;
	flashSeparators: boolean;
	show: boolean;
	paused: boolean;
	minDateTime: string | null;
	maxDateTime: string | null;
	boundaryLocked: boolean;
}
```

- [ ] **Step 2: Add defaults to `DefaultAppManagerState`**

In the same file, extend `DefaultAppManagerState.System.Manager.DateAndTime`:

```typescript
DateAndTime: {
	show: true,
	dateTime: new Date().toISOString(),
	timeZoneOffset: (new Date().getTimezoneOffset() / -60).toString(),
	militaryTime: false,
	displaySeconds: true,
	displayPeriod: true,
	displayDay: true,
	displayLongDay: false,
	flashSeparators: true,
	paused: false,
	minDateTime: null,
	maxDateTime: null,
	boundaryLocked: false,
},
```

- [ ] **Step 3: Update `makeStore` in the event handler test**

In `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts`, update `makeStore` to accept overrides and include the new fields:

```typescript
function makeStore(
	overrides: Partial<{
		minDateTime: string | null;
		maxDateTime: string | null;
		boundaryLocked: boolean;
		paused: boolean;
		dateTime: string;
	}> = {},
): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					...overrides,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: [],
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map((type) => [
							type,
							"Finder.app",
						]),
					) as Record<ClassicyFileSystemEntryFileType, string>,
				},
				Appearance: {
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
			},
		},
	};
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm build:source
```

Expected: no type errors (the existing tests still pass the new fields via `makeStore` defaults).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts \
        src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts
git commit -m "feat: add minDateTime/maxDateTime/boundaryLocked to DateAndTime state"
```

---

### Task 2: Enforce bounds in event handler

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler.ts`
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts`

**Interfaces:**
- Consumes: `ClassicyStoreSystemDateAndTimeManager.minDateTime`, `.maxDateTime`, `.boundaryLocked` from Task 1
- Produces: `ClassicyManagerDateTimeSet` enforces bounds and writes `boundaryLocked`; `ClassicyManagerDateTimeResume` is gated by `boundaryLocked`

- [ ] **Step 1: Write the failing bound-enforcement tests**

Add these test blocks in `ClassicyDateTimeManagerEventHandler.test.ts` (after the existing TZ tests):

```typescript
describe("classicyDateTimeManagerEventHandler — boundary enforcement", () => {
	const MIN = "2020-01-01T00:00:00.000Z";
	const MAX = "2025-01-01T00:00:00.000Z";

	it("stores the date and clears boundaryLocked when date is within bounds", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		const date = new Date("2022-06-15T12:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("clamps to maxDateTime and sets boundaryLocked when date equals maxDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date(MAX),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MAX);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(true);
	});

	it("clamps to maxDateTime and sets boundaryLocked when date exceeds maxDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2030-01-01T00:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MAX);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(true);
	});

	it("clamps to minDateTime and clears boundaryLocked when date is below minDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2010-01-01T00:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MIN);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("clears boundaryLocked when date is set back within bounds after a lock", () => {
		const ds = makeStore({
			minDateTime: MIN,
			maxDateTime: MAX,
			boundaryLocked: true,
			dateTime: MAX,
		});
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2022-06-15T12:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("ignores ClassicyManagerDateTimeResume when boundaryLocked is true", () => {
		const ds = makeStore({ boundaryLocked: true, paused: true });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeResume",
		});
		expect(ds.System.Manager.DateAndTime.paused).toBe(true);
	});

	it("resumes normally when boundaryLocked is false", () => {
		const ds = makeStore({ boundaryLocked: false, paused: true });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeResume",
		});
		expect(ds.System.Manager.DateAndTime.paused).toBe(false);
	});

	it("applies no clamping when minDateTime is null", () => {
		const ds = makeStore({ minDateTime: null, maxDateTime: MAX });
		const date = new Date("2000-01-01T00:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("applies no clamping when maxDateTime is null", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: null });
		const date = new Date("2099-01-01T00:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -A2 "boundary enforcement"
```

Expected: all 9 boundary enforcement tests FAIL (handler doesn't implement clamping yet).

- [ ] **Step 3: Implement bounds enforcement in the event handler**

Replace `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler.ts` with:

```typescript
import {
	hasDateTime,
	hasTzOffset,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export const classicyDateTimeManagerEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyManagerDateTimeSet": {
			if (!hasDateTime(action)) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Expected a Date for dateTime",
					{ received: action.dateTime, receivedType: typeof action.dateTime },
				);
				break;
			}
			const { minDateTime, maxDateTime } = ds.System.Manager.DateAndTime;
			const isoValue = action.dateTime.toISOString();

			if (maxDateTime !== null && isoValue >= maxDateTime) {
				ds.System.Manager.DateAndTime.dateTime = maxDateTime;
				ds.System.Manager.DateAndTime.boundaryLocked = true;
			} else if (minDateTime !== null && isoValue < minDateTime) {
				ds.System.Manager.DateAndTime.dateTime = minDateTime;
				ds.System.Manager.DateAndTime.boundaryLocked = false;
			} else {
				ds.System.Manager.DateAndTime.dateTime = isoValue;
				ds.System.Manager.DateAndTime.boundaryLocked = false;
			}
			break;
		}
		case "ClassicyManagerDateTimeTZSet": {
			if (!hasTzOffset(action)) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Invalid tzOffset:",
					action.tzOffset,
				);
				break;
			}
			const offset = Number(action.tzOffset);
			if (!Number.isFinite(offset) || offset < -12 || offset > 14) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Invalid tzOffset:",
					action.tzOffset,
				);
				break;
			}
			ds.System.Manager.DateAndTime.timeZoneOffset = String(offset);
			break;
		}
		case "ClassicyManagerDateTimePause": {
			ds.System.Manager.DateAndTime.paused = true;
			break;
		}
		case "ClassicyManagerDateTimeResume": {
			if (ds.System.Manager.DateAndTime.boundaryLocked) {
				break;
			}
			ds.System.Manager.DateAndTime.paused = false;
			break;
		}
	}
	return ds;
};
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler.ts \
        src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateTimeManagerEventHandler.test.ts
git commit -m "feat: enforce min/max bounds in DateAndTime event handler"
```

---

### Task 3: Hook tick bounds checking

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx`

**Interfaces:**
- Consumes: `ClassicyStoreSystemDateAndTimeManager.minDateTime`, `.maxDateTime`, `.boundaryLocked` from Task 1; `ClassicyManagerDateTimeSet` with clamping from Task 2
- Produces: `ClassicyDateTimeValue` gains `boundaryLocked: boolean`; tick interval checks bounds and dispatches corrections

- [ ] **Step 1: Add `boundaryLocked` to `ClassicyDateTimeValue` interface**

In `ClassicyDateAndTimeManagerUtils.tsx`, extend the interface:

```typescript
export interface ClassicyDateTimeValue {
	dateTime: string;
	tzOffset: number;
	localDate: Date;
	localHMS: string;
	paused: boolean;
	boundaryLocked: boolean;
	setDateTime: (date: Date) => void;
	setTzOffset: (offset: string) => void;
	pause: () => void;
	resume: () => void;
}
```

- [ ] **Step 2: Read bounds state and add refs in `useClassicyDateTime`**

In the `useClassicyDateTime` function body, after the existing `pausedRef` lines, add:

```typescript
const boundaryLocked = dateAndTime.boundaryLocked;
const minDateTime = dateAndTime.minDateTime ?? null;
const maxDateTime = dateAndTime.maxDateTime ?? null;

const boundaryLockedRef = useRef(boundaryLocked);
boundaryLockedRef.current = boundaryLocked;
const minDateTimeRef = useRef(minDateTime);
minDateTimeRef.current = minDateTime;
const maxDateTimeRef = useRef(maxDateTime);
maxDateTimeRef.current = maxDateTime;
```

- [ ] **Step 3: Update the tick `useEffect` to check bounds**

Replace the existing tick `useEffect`:

```typescript
useEffect(() => {
	if (!tick) return;
	const id = setInterval(() => {
		if (pausedRef.current || boundaryLockedRef.current) return;

		const virtualNow = computeAnchoredTime(
			virtualAnchorMsRef.current,
			realAnchorMsRef.current,
		);
		const virtualNowMs = virtualNow.getTime();

		const minMs =
			minDateTimeRef.current !== null
				? new Date(minDateTimeRef.current).getTime()
				: null;
		const maxMs =
			maxDateTimeRef.current !== null
				? new Date(maxDateTimeRef.current).getTime()
				: null;

		if (minMs !== null && virtualNowMs < minMs) {
			dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: new Date(minMs) });
			return;
		}

		if (maxMs !== null && virtualNowMs >= maxMs) {
			dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: new Date(maxMs) });
			return;
		}

		setLocalDate((prev) => {
			if (
				Math.floor(prev.getTime() / 1000) ===
				Math.floor(virtualNowMs / 1000)
			) {
				return prev;
			}
			return virtualNow;
		});
	}, 250);
	return () => clearInterval(id);
}, [tick, dispatch]);
```

- [ ] **Step 4: Add `boundaryLocked` to the hook return value**

Replace the final `return` in `useClassicyDateTime`:

```typescript
return {
	dateTime: dateAndTime.dateTime,
	tzOffset,
	localDate,
	localHMS,
	paused,
	boundaryLocked,
	setDateTime,
	setTzOffset,
	pause,
	resume,
};
```

- [ ] **Step 5: Verify TypeScript compiles and tests pass**

```bash
pnpm build:source && pnpm test
```

Expected: no type errors, all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx
git commit -m "feat: check bounds on every tick in useClassicyDateTime hook"
```

---

### Task 4: DatePicker min/max clamping

**Files:**
- Modify: `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.tsx`

**Interfaces:**
- Produces: `ClassicyDatePickerProps` gains `minValue?: Date` and `maxValue?: Date`; `onChangeFunc` is never called with an out-of-range date

- [ ] **Step 1: Add `minValue` and `maxValue` to the props interface**

In `ClassicyDatePicker.tsx`, replace the `ClassicyDatePickerProps` interface:

```typescript
interface ClassicyDatePickerProps {
	id: string;
	onChangeFunc?: (date: Date) => void;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: Date;
	disabled?: boolean;
	labelDisabled?: boolean;
	isDefault?: boolean;
	minValue?: Date;
	maxValue?: Date;
}
```

- [ ] **Step 2: Destructure the new props in the component function**

Update the function signature destructuring (the inner `function ClassicyDatePicker(...)`) to include the new props:

```typescript
function ClassicyDatePicker(
	{
		id,
		labelTitle,
		labelSize = "medium",
		labelPosition = "above",
		disabled = false,
		labelDisabled,
		isDefault,
		onChangeFunc,
		minValue,
		maxValue,
	},
	_ref,
)
```

- [ ] **Step 3: Add a `clampDate` helper and update `handleDateChange`**

Inside the component body, after the existing `selectText` function, add:

```typescript
const clampDate = (date: Date): Date => {
	if (minValue !== undefined && date.getTime() < minValue.getTime())
		return new Date(minValue.getTime());
	if (maxValue !== undefined && date.getTime() >= maxValue.getTime())
		return new Date(maxValue.getTime());
	return date;
};
```

Then replace `handleDateChange`:

```typescript
const handleDateChange = (date: Date) => {
	const clamped = clampDate(date);
	if (clamped !== date) {
		setSelectedDate(clamped);
		setMonth((clamped.getMonth() + 1).toString());
		setDay(clamped.getDate().toString());
		setYear(clamped.getFullYear().toString());
	}
	if (onChangeFunc) {
		onChangeFunc(clamped);
	}
};
```

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
pnpm build:source && pnpm test
```

Expected: no type errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.tsx
git commit -m "feat: add minValue/maxValue clamping to ClassicyDatePicker"
```

---

### Task 5: TimePicker min/max clamping

**Files:**
- Modify: `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.tsx`

**Interfaces:**
- Produces: `ClassicyTimePickerProps` gains `minValue?: Date` and `maxValue?: Date`; `onChangeFunc` is never called with an out-of-range datetime

- [ ] **Step 1: Add `minValue` and `maxValue` to the props interface**

In `ClassicyTimePicker.tsx`, replace `ClassicyTimePickerProps`:

```typescript
interface ClassicyTimePickerProps {
	id: string;
	onChangeFunc?: (updatedDate: Date) => void;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: Date;
	disabled?: boolean;
	labelDisabled?: boolean;
	isDefault?: boolean;
	ref?: ForwardedRef<HTMLInputElement>;
	minValue?: Date;
	maxValue?: Date;
}
```

- [ ] **Step 2: Destructure the new props in the component function**

Update the inner `function ClassicyTimePicker(...)` destructuring:

```typescript
function ClassicyTimePicker(
	{
		id,
		labelTitle,
		labelSize = "medium",
		labelPosition = "above",
		placeholder,
		prefillValue,
		disabled = false,
		labelDisabled,
		isDefault,
		onChangeFunc,
		minValue,
		maxValue,
	},
	ref,
)
```

- [ ] **Step 3: Add a `clampDateTime` helper and update `handleDateChange`**

Inside the component body, after the `handleDateChange` line, add:

```typescript
const clampDateTime = (date: Date): Date => {
	if (minValue !== undefined && date.getTime() < minValue.getTime())
		return new Date(minValue.getTime());
	if (maxValue !== undefined && date.getTime() >= maxValue.getTime())
		return new Date(maxValue.getTime());
	return date;
};
```

Then replace the `handleDateChange` line (keeping it a one-liner but wrapping through clamp):

```typescript
const handleDateChange = (date: Date) => {
	const clamped = clampDateTime(date);
	if (clamped !== date) {
		const h = clamped.getHours();
		const isPm = h >= 12;
		setSelectedDate(clamped);
		setHour((isPm ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h).toString());
		setMinutes(clamped.getMinutes().toString());
		setSeconds(clamped.getSeconds().toString());
		setPeriod(isPm ? "pm" : "am");
	}
	onChangeFunc?.(clamped);
};
```

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
pnpm build:source && pnpm test
```

Expected: no type errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.tsx
git commit -m "feat: add minValue/maxValue clamping to ClassicyTimePicker"
```

---

### Task 6: Wire bounds into DateAndTimeManager

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx`

**Interfaces:**
- Consumes: `ClassicyDatePickerProps.minValue`/`.maxValue` from Task 4; `ClassicyTimePickerProps.minValue`/`.maxValue` from Task 5; `minDateTime`/`maxDateTime` from store state (Task 1)

- [ ] **Step 1: Derive TZ-adjusted bound Dates from store state**

In `ClassicyDateAndTimeManager.tsx`, after the existing `tzOffset` / `date` derivation block (around line 159), add:

```typescript
const adjustToDisplay = (isoString: string): Date =>
	new Date(
		new Date(isoString).getTime() +
			tzOffset * 3600000 +
			new Date().getTimezoneOffset() * 60000,
	);

const minValue = dateAndTimeState.minDateTime
	? adjustToDisplay(dateAndTimeState.minDateTime)
	: undefined;
const maxValue = dateAndTimeState.maxDateTime
	? adjustToDisplay(dateAndTimeState.maxDateTime)
	: undefined;
```

- [ ] **Step 2: Pass `minValue`/`maxValue` to `ClassicyDatePicker`**

Update the `ClassicyDatePicker` JSX:

```tsx
<ClassicyDatePicker
	id={"date"}
	labelTitle={""}
	prefillValue={date}
	onChangeFunc={updateSystemDate}
	minValue={minValue}
	maxValue={maxValue}
/>
```

- [ ] **Step 3: Pass `minValue`/`maxValue` to `ClassicyTimePicker`**

Update the `ClassicyTimePicker` JSX:

```tsx
<ClassicyTimePicker
	id={"time"}
	labelTitle={""}
	labelPosition="left"
	onChangeFunc={updateSystemTime}
	prefillValue={date}
	minValue={minValue}
	maxValue={maxValue}
/>
```

- [ ] **Step 4: Verify TypeScript compiles and all tests pass**

```bash
pnpm build:source && pnpm test
```

Expected: no type errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx
git commit -m "feat: pass minValue/maxValue bounds to date and time pickers"
```
