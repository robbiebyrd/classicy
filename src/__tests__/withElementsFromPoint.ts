// Test helper: jsdom has no `document.elementsFromPoint`, so a file drag's
// hit-test (`findClassicyFileDropTarget`) sees nothing. This stubs it to
// return `hits` while `run` executes, then restores whatever was there.
export function withElementsFromPoint(hits: Element[], run: () => void): void {
	const original = document.elementsFromPoint;
	document.elementsFromPoint = () => hits;
	try {
		run();
	} finally {
		document.elementsFromPoint = original;
	}
}
