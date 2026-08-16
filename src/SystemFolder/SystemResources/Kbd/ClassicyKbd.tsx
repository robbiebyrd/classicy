import "./ClassicyKbd.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, PropsWithChildren } from "react";
import { parseKeyboardShortcut } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

const MODIFIER_GLYPHS = {
	control: "⌃",
	option: "⌥",
	shift: "⇧",
	command: "⌘",
} as const;

type ClassicyKbdProps = PropsWithChildren<{
	/**
	 * A shortcut in any spelling `parseKeyboardShortcut` accepts ("Cmd+Shift+S",
	 * "Command-O", "⌘N", "F1"). When set it renders in the canonical Platinum
	 * glyph form (Control ⌃, Option ⌥, Shift ⇧, Command ⌘ order, then the key)
	 * and `children` are ignored. Without it, `children` render verbatim —
	 * useful for keys with no chord ("Esc", "Tab").
	 */
	shortcut?: string;
	/**
	 * `inline` renders the whole glyph run as one `<kbd>` (the menu-item look);
	 * `keycaps` renders one raised Platinum key cap per key in the chord.
	 */
	variant?: "inline" | "keycaps";
	className?: string;
}>;

/**
 * The parts of a chord in canonical display order, one entry per key cap.
 * "Cmd+Shift+S" → ["⇧", "⌘", "S"].
 */
const shortcutParts = (shortcut: string): string[] => {
	const p = parseKeyboardShortcut(shortcut);
	const parts: string[] = [];
	if (p.control) parts.push(MODIFIER_GLYPHS.control);
	if (p.option) parts.push(MODIFIER_GLYPHS.option);
	if (p.shift) parts.push(MODIFIER_GLYPHS.shift);
	if (p.command) parts.push(MODIFIER_GLYPHS.command);
	if (p.key) parts.push(p.key);
	return parts;
};

export const ClassicyKbd: FunctionalComponent<ClassicyKbdProps> = ({
	shortcut,
	variant = "inline",
	className,
	children,
}) => {
	const parts = shortcut !== undefined ? shortcutParts(shortcut) : undefined;

	if (parts !== undefined && parts.length === 0) return null;
	if (parts === undefined && children === undefined) return null;

	if (variant === "keycaps") {
		// Nested <kbd> is the HTML-sanctioned markup for "keys to press",
		// one inner <kbd> per actual key cap.
		return (
			<kbd
				className={classNames("classicyKbd", "classicyKbdKeycaps", className)}
			>
				{(parts ?? [children]).map((part, index) => (
					<kbd
						// biome-ignore lint/suspicious/noArrayIndexKey: cap order is the identity; parts never reorder
						key={index}
						className="classicyKbdKeycap"
					>
						{part}
					</kbd>
				))}
			</kbd>
		);
	}

	return (
		<kbd className={classNames("classicyKbd", "classicyKbdInline", className)}>
			{parts !== undefined ? parts.join("") : children}
		</kbd>
	);
};
