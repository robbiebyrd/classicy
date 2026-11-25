import "./ClassicyKbd.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	PropsWithChildren,
	ReactNode,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	CLASSICY_MODIFIER_GLYPHS,
	CLASSICY_MODIFIER_KEY_NAMES,
	type ClassicyModifierName,
	classicyKeycapName,
	keyboardShortcutModifiers,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

type ClassicyKbdProps = PropsWithChildren<{
	/**
	 * A shortcut in any spelling `parseKeyboardShortcut` accepts ("Cmd+Shift+S",
	 * "Command-O", "⌘N", "F1"). When set it renders in the canonical Platinum
	 * glyph form (Control ⌃, Option ⌥, Shift ⇧, Command ⌘ order, then the key)
	 * and `children` are ignored; `inline` spells it with the keycaps' names
	 * instead ("Ctrl+Shift+S") under a package whose
	 * `layout.menu.shortcutSpelling` is `"names"` (Windows 98). Without it,
	 * `children` render verbatim — useful for keys with no chord ("Esc",
	 * "Tab").
	 */
	shortcut?: string;
	/**
	 * `inline` renders the whole glyph run as one `<kbd>` (the menu-item look);
	 * `keycaps` renders one raised Platinum key cap per key in the chord.
	 * Defaults to `inline`.
	 */
	variant?: "inline" | "keycaps";
	/** Extra class names merged onto the outer `<kbd>`. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}>;

/**
 * One modifier's glyph (or, spelled by name, its name and the `+` after it),
 * addressable by a package as `[data-classicy-part="modifier-<name>"]`.
 */
const ModifierGlyph = ({
	name,
	children,
}: {
	name: ClassicyModifierName;
	children?: ReactNode;
}) => (
	<span
		className="classicyKbdModifier"
		{...{ [CLASSICY_PART_ATTRIBUTE.part]: `modifier-${name}` }}
	>
		{children ?? CLASSICY_MODIFIER_GLYPHS[name]}
	</span>
);

/**
 * The parts of a chord in canonical display order, one entry per key cap:
 * a span per modifier, then the key. "Cmd+Shift+S" → [⇧, ⌘, "S"]. Spelled
 * by name, each modifier's span holds its name and the `+` joining it to
 * what follows, and the key is its keycap's name: "Cmd+Shift+S" →
 * ["Shift+", "Win+", "S"], read "Shift+Win+S" (WIG Ch.7 "Shortcut Keys in
 * Menu Items", p.110).
 */
const shortcutParts = (shortcut: string, names = false): ReactNode[] => {
	const parsed = parseKeyboardShortcut(shortcut);
	const modifiers = keyboardShortcutModifiers(parsed);
	const parts: ReactNode[] = modifiers.map((name, i) =>
		names ? (
			<ModifierGlyph key={name} name={name}>
				{CLASSICY_MODIFIER_KEY_NAMES[name]}
				{parsed.key || i < modifiers.length - 1 ? "+" : ""}
			</ModifierGlyph>
		) : (
			<ModifierGlyph key={name} name={name} />
		),
	);
	if (parsed.key)
		parts.push(names ? classicyKeycapName(parsed.key) : parsed.key);
	return parts;
};

/**
 * A keyboard shortcut or key, drawn the Platinum way — use it instead of a raw
 * `<kbd>`, which it renders. Pass `shortcut` in any spelling
 * `parseKeyboardShortcut` understands ("Cmd+Shift+S", "Command-O", "⌘N") and
 * it is normalized to the canonical glyph order ⌃⌥⇧⌘ + key, so the same
 * string always reads the same; or pass `children` for a bare key ("Esc").
 *
 * `inline` (default) is the menu-item glyph run — `ClassicyMenu` renders each
 * item's `keyboardShortcut` through this component — and `keycaps` draws one
 * raised key cap per key, for help text and documentation. Under a package
 * whose `layout.menu.shortcutSpelling` is `"names"` (Windows 98), `inline`
 * spells the shortcut as Windows' menus do, "Ctrl+Shift+S" (⌃ Ctrl, ⌥ Alt,
 * ⇧ Shift, ⌘ Win; ⌫ Backspace, ⌦ Del, the arrows Up, Down, Left and Right,
 * Escape Esc), each modifier's span holding its name and `+`. It renders
 * nothing when the shortcut parses to no keys or there is nothing to show.
 *
 * ```tsx
 * <p>Save a copy with <ClassicyKbd shortcut="Cmd+Shift+S" />.</p>
 * ```
 */
export const ClassicyKbd: FunctionalComponent<ClassicyKbdProps> = ({
	shortcut,
	variant = "inline",
	className,
	style,
	children,
}) => {
	// Windows spells a menu's shortcut by its keycaps' names (WIG Ch.7, p.110);
	// key caps always draw the glyphs.
	const names =
		useClassicyAppearanceLayout().menu?.shortcutSpelling === "names" &&
		variant === "inline";
	const parts =
		shortcut !== undefined ? shortcutParts(shortcut, names) : undefined;

	if (parts !== undefined && parts.length === 0) return null;
	if (parts === undefined && children === undefined) return null;

	if (variant === "keycaps") {
		// Nested <kbd> is the HTML-sanctioned markup for "keys to press",
		// one inner <kbd> per actual key cap.
		return (
			<kbd
				className={classNames("classicyKbd", "classicyKbdKeycaps", className)}
				style={style}
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
		<kbd
			className={classNames("classicyKbd", "classicyKbdInline", className)}
			style={style}
		>
			{parts ?? children}
		</kbd>
	);
};
