// Types for captureSafety.mjs, for the TypeScript tests that import it.

/** `<name>.png`; throws when `name` is not letters, digits, `_`, `.` and `-`. */
export declare const captureFileName: (name: unknown) => string;

/** Why `serve` refuses a request with these headers, or null. */
export declare const refusedCaptureRequest: (
	headers: Record<string, string | string[] | undefined>,
) => string | null;
