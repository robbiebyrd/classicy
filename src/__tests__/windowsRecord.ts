/**
 * Build an app's `windows` record from window fixtures, keyed by each
 * fixture's `id` in argument order — the test-side spelling of the old
 * `windows: [a, b]` array literal.
 */
export function windowsRecord<W extends { id: string }>(
	...windows: W[]
): Record<string, W> {
	const record: Record<string, W> = {};
	for (const w of windows) record[w.id] = w;
	return record;
}
