import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Helpers the two storage adapters share: the file system's
 * (`ClassicyFileSystemAdapter.ts`) and the desktop state's
 * (`ClassicyStateAdapter.ts`).
 */

/** The sha256 of `text` (UTF-8), in hex: a snapshot's `hash`. */
export const classicySha256Hex = (text: string): string =>
	bytesToHex(sha256(new TextEncoder().encode(text)));

/**
 * Run `hook` (an adapter's method, called on `adapter`), isolating
 * synchronous throws and async rejections so a faulty adapter can never
 * block local operation or other adapters. A failure is logged under
 * `subsystem` as `adapter "<id>" failed in <hookName>`.
 *
 * Resolves true when the hook completed (or is not implemented), false when
 * it threw or rejected.
 */
export function invokeClassicyAdapterHook<Payload>(
	subsystem: string,
	adapter: { id: string },
	hookName: string,
	hook: ((payload: Payload) => void | Promise<void>) | undefined,
	payload: Payload,
): Promise<boolean> {
	if (!hook) return Promise.resolve(true);
	const logFailure = (error: unknown) => {
		classicyLog(
			"error",
			subsystem,
			`adapter "${adapter.id}" failed in ${hookName}`,
			error,
		);
		return false;
	};
	try {
		return Promise.resolve(hook.call(adapter, payload)).then(
			() => true,
			logFailure,
		);
	} catch (error) {
		return Promise.resolve(logFailure(error));
	}
}
