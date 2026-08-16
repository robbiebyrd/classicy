import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export type ClassicyListNavigationRow = { id: string; label: string };

/**
 * Roving-tabindex keyboard navigation over an ordered list of rows: one row
 * is the list's single tab stop, ArrowUp/ArrowDown/Home/End move it, and
 * printable characters type-select (0.7 s buffer, wrap-around, searches
 * forward from the row after the current one). Extracted from ClassicyTree
 * so flat lists (ClassicyListBox) and trees navigate identically; what
 * "selection" means stays entirely with the caller.
 */
export const useListNavigation = (rows: ClassicyListNavigationRow[]) => {
	// The row currently driving the roving tabindex. Deliberately separate
	// from any selection state a caller keeps — a row can be the keyboard's
	// tab stop without being selected.
	const [activeId, setActiveId] = useState<string | undefined>();

	const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
	const typeBuffer = useRef("");
	const typeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(
		() => () => {
			if (typeTimer.current) clearTimeout(typeTimer.current);
		},
		[],
	);

	const registerRef = useCallback((id: string, el: HTMLElement | null) => {
		if (el) rowRefs.current.set(id, el);
		else rowRefs.current.delete(id);
	}, []);

	const selectRow = useCallback((id: string) => {
		setActiveId(id);
		rowRefs.current.get(id)?.focus();
	}, []);

	// The first row is the tab stop until the user navigates, so the list is
	// reachable with a single Tab and then driven by the arrow keys.
	const tabStopId = activeId ?? rows[0]?.id;
	const currentIndex = activeId ? rows.findIndex((r) => r.id === activeId) : -1;

	const typeSelect = useCallback(
		(ch: string, fromIndex: number): string | null => {
			if (typeTimer.current) clearTimeout(typeTimer.current);
			typeBuffer.current += ch.toLowerCase();
			typeTimer.current = setTimeout(() => {
				typeBuffer.current = "";
			}, 700);
			const buf = typeBuffer.current;
			const start = fromIndex < 0 ? 0 : fromIndex;
			// Search forward from the row after the current one, wrapping around.
			const order = [...rows.slice(start + 1), ...rows.slice(0, start + 1)];
			const match = order.find((r) => r.label.toLowerCase().startsWith(buf));
			if (!match) return null;
			selectRow(match.id);
			return match.id;
		},
		[rows, selectRow],
	);

	/**
	 * Handle a keydown if it is a navigation key. Returns the id of the row
	 * navigated to, or `null` when the key was not consumed (so the caller's
	 * own handling — selection, expansion, activation — runs next).
	 */
	const handleNavKey = useCallback(
		(e: ReactKeyboardEvent): string | null => {
			if (rows.length === 0) return null;
			switch (e.key) {
				case "ArrowDown": {
					e.preventDefault();
					const ni = Math.min(currentIndex + 1, rows.length - 1);
					const id = rows[ni < 0 ? 0 : ni].id;
					selectRow(id);
					return id;
				}
				case "ArrowUp": {
					e.preventDefault();
					const ni = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
					const id = rows[ni].id;
					selectRow(id);
					return id;
				}
				case "Home": {
					e.preventDefault();
					const id = rows[0].id;
					selectRow(id);
					return id;
				}
				case "End": {
					e.preventDefault();
					const id = rows[rows.length - 1].id;
					selectRow(id);
					return id;
				}
				default: {
					const isPrintable =
						e.key.length === 1 &&
						e.key !== " " &&
						!e.metaKey &&
						!e.ctrlKey &&
						!e.altKey;
					if (isPrintable) {
						return typeSelect(e.key, currentIndex);
					}
					return null;
				}
			}
		},
		[rows, currentIndex, selectRow, typeSelect],
	);

	return {
		activeId,
		setActiveId,
		tabStopId,
		currentIndex,
		registerRef,
		selectRow,
		handleNavKey,
	};
};
