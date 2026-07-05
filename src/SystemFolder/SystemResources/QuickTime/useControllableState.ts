import { useCallback, useRef, useState } from "react";

/**
 * Controlled-if-provided state. When `controlled` is defined the hook mirrors
 * it (the parent owns the value and hears changes via onChange); when
 * undefined the hook owns internal state, preserving the component's original
 * self-contained behavior.
 */
export function useControllableState<T>(
	controlled: T | undefined,
	defaultValue: T,
	onChange?: (value: T) => void,
): [T, (next: T | ((prev: T) => T)) => void] {
	const [internal, setInternal] = useState<T>(defaultValue);
	const isControlled = controlled !== undefined;
	const value = isControlled ? (controlled as T) : internal;

	const valueRef = useRef(value);
	valueRef.current = value;
	const isControlledRef = useRef(isControlled);
	isControlledRef.current = isControlled;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const setValue = useCallback((next: T | ((prev: T) => T)) => {
		const resolved =
			typeof next === "function"
				? (next as (prev: T) => T)(valueRef.current)
				: next;
		if (!isControlledRef.current) {
			setInternal(resolved);
		}
		onChangeRef.current?.(resolved);
	}, []);

	return [value, setValue];
}
