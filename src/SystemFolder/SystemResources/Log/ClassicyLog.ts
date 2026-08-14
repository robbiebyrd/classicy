export type ClassicyLogLevel = "debug" | "info" | "warn" | "error";

export interface ClassicyLogEntry {
	level: ClassicyLogLevel;
	/** Which part of Classicy emitted this (e.g. "registerApp", "ScreenSaver"). */
	subsystem: string;
	message: string;
	/** Any extra values the call site logged alongside the message. */
	details: unknown[];
	/** ISO 8601 emission time. */
	timestamp: string;
}

/**
 * A host-registered receiver for Classicy's diagnostics. Capability-based
 * like `ClassicyFileSystemAdapter`: implement any subset of the hooks.
 */
export interface ClassicyLogSink {
	id: string;
	/** Every entry, all levels. */
	onLog?(entry: ClassicyLogEntry): void;
	/** Error-level entries only, called in addition to `onLog`. */
	onError?(entry: ClassicyLogEntry): void;
	/** Render crashes caught by the desktop's error boundary (Sad Mac). */
	onCrash?(error: Error, componentStack?: string): void;
}

const sinks = new Map<string, ClassicyLogSink>();

/**
 * Register a log sink. Call at app entry, like the other `registerClassicy*`
 * seams. Re-registering an id replaces the previous sink.
 */
export function registerClassicyLogSink(sink: ClassicyLogSink): void {
	sinks.set(sink.id, sink);
}

export function unregisterClassicyLogSink(id: string): void {
	sinks.delete(id);
}

export function getClassicyLogSinks(): ClassicyLogSink[] {
	return [...sinks.values()];
}

/**
 * A faulty sink must never break Classicy or starve the other sinks, so each
 * hook call is isolated. Sink failures go straight to the console rather than
 * back through the log pipeline — a throwing sink would recurse.
 */
const invokeSink = (sink: ClassicyLogSink, call: () => void): void => {
	try {
		call();
	} catch (err) {
		console.error(`[ClassicyLog] sink "${sink.id}" threw`, err);
	}
};

/**
 * Emit a diagnostic. Sinks receive every entry unconditionally — including in
 * production builds, which is the whole point of the facility. The console
 * mirror keeps the library's pre-sink behavior: debug/info/warn print only in
 * non-production builds; errors always print, so a production console is
 * never silent about real failures.
 */
export function classicyLog(
	level: ClassicyLogLevel,
	subsystem: string,
	message: string,
	...details: unknown[]
): void {
	const entry: ClassicyLogEntry = {
		level,
		subsystem,
		message,
		details,
		timestamp: new Date().toISOString(),
	};
	for (const sink of sinks.values()) {
		if (sink.onLog) invokeSink(sink, () => sink.onLog?.(entry));
		if (level === "error" && sink.onError) {
			invokeSink(sink, () => sink.onError?.(entry));
		}
	}
	// Prefix and message are joined so console output is byte-identical to the
	// library's pre-sink `console.*("[Subsystem] message", ...)` calls.
	const prefixed = `[${subsystem}] ${message}`;
	if (level === "error") {
		console.error(prefixed, ...details);
	} else if (process.env.NODE_ENV !== "production") {
		const mirror =
			level === "warn"
				? console.warn
				: level === "info"
					? console.info
					: console.debug;
		mirror(prefixed, ...details);
	}
}

/**
 * Report a render crash to sinks. Called by `ClassicyCrashScreen`'s
 * `componentDidCatch`; the boundary keeps its own `console.error`, so this
 * only fans out to hosts.
 */
export function emitClassicyCrash(
	error: Error,
	componentStack?: string,
): void {
	for (const sink of sinks.values()) {
		if (sink.onCrash) {
			invokeSink(sink, () => sink.onCrash?.(error, componentStack));
		}
	}
}
