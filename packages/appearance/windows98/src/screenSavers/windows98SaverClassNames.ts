/**
 * A saver root's class list: its own class, then any truthy extras (a host's
 * `className`), space-separated, as Platinum's savers build theirs.
 */
export const windows98SaverClassNames = (
	...names: ReadonlyArray<string | false | null | undefined>
): string => names.filter(Boolean).join(" ");
