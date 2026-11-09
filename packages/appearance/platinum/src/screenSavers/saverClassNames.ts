/**
 * A saver root's class list: its own class, then any truthy extras (a state
 * class, a host's `className`), space-separated. The savers' stand-in for the
 * `classnames` package, which Platinum does not depend on.
 */
export const saverClassNames = (
	...names: ReadonlyArray<string | false | null | undefined>
): string => names.filter(Boolean).join(" ");
