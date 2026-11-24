/**
 * The menu bar clock's minute tick (`ClassicyDesktopMenuWidgetTime`) writes
 * the virtual time to the store once a minute; that write is not a change a
 * user made. The clock notes each tick's time here, just before it dispatches,
 * so the desktop state adapters (`ClassicyStateSync.internal.ts`) can tell a
 * tick from a clock edit (story 0229-ymq, review I1). Store-free.
 */
let lastTickMs: number | undefined;

/** Notes that the clock is about to write `date` as a tick. */
export const noteClassicyClockTick = (date: Date): void => {
	lastTickMs = date.getTime();
};

/** True when `ms` is the time the clock's last tick wrote. */
export const isClassicyClockTick = (ms: number): boolean =>
	lastTickMs !== undefined && ms === lastTickMs;

/** Tests only: forget the last tick. */
export const resetClassicyClockTickForTests = (): void => {
	lastTickMs = undefined;
};
