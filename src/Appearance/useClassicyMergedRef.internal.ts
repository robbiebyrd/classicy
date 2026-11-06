import {
	type Ref,
	type RefCallback,
	type RefObject,
	useCallback,
	useRef,
} from "react";

/**
 * A component's own ref to its root merged with the ref a consumer forwarded,
 * for components that need the root themselves (the appearance hook) and
 * still forward it. Returns `[ownRef, setRef]`: pass `setRef` as the
 * element's `ref` and read the element from `ownRef`.
 *
 * `setRef` keeps its identity while `forwarded` does, so React never detaches
 * and re-attaches it on a re-render. Every ref form React accepts reaches the
 * element:
 * - an object ref gets `.current` set, and cleared on detach;
 * - a classic callback ref is called with the element, then with `null`;
 * - a React 19 callback ref that returns a cleanup has that cleanup run on
 *   detach instead of being called with `null`.
 *
 * Under React 19 `setRef` returns a cleanup, so React never calls it with
 * `null`; React 18 ignores the returned function and detaches by calling it
 * with `null`, which the `el === null` path handles.
 * @internal
 */
export function useClassicyMergedRef<E>(
	forwarded: Ref<E> | undefined,
): [RefObject<E | null>, RefCallback<E>] {
	const ownRef = useRef<E | null>(null);
	const setRef = useCallback(
		(el: E | null) => {
			ownRef.current = el;
			let forwardedCleanup: (() => void) | undefined;
			if (typeof forwarded === "function") {
				const result = forwarded(el);
				if (typeof result === "function") forwardedCleanup = result;
			} else if (forwarded) {
				forwarded.current = el;
			}
			if (el === null) return;
			return () => {
				ownRef.current = null;
				if (forwardedCleanup) forwardedCleanup();
				else if (typeof forwarded === "function") forwarded(null);
				else if (forwarded) forwarded.current = null;
			};
		},
		[forwarded],
	);
	return [ownRef, setRef];
}
