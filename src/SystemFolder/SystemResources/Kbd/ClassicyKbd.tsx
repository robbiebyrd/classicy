import "./ClassicyKbd.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	PropsWithChildren,
	ReactNode,
} from "react";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	CLASSICY_MODIFIER_GLYPHS,
	type ClassicyModifierName,
	keyboardShortcutModifiers,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

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
	 * Defaults to `inline`.
	 */
	variant?: "inline" | "keycaps";
	/** Extra class names merged onto the outer `<kbd>`. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}>;

/**
 * One modifier's glyph, addressable by a package as
 * `[data-classicy-part="modifier-<name>"]`.
 */
const ModifierGlyph = ({ name }: { name: ClassicyModifierName }) => (
	<span
		className="classicyKbdModifier"
		{...{ [CLASSICY_PART_ATTRIBUTE.part]: `modifier-${name}` }}
	>
		{CLASSICY_MODIFIER_GLYPHS[name]}
	</span>
);

/**
 * The parts of a chord in canonical display order, one entry per key cap:
 * a span per modifier, then the key. "Cmd+Shift+S" → [⇧, ⌘, "S"].
 */
const shortcutParts = (shortcut: string): ReactNode[] => {
	const parsed = parseKeyboardShortcut(shortcut);
	const parts: ReactNode[] = keyboardShortcutModifiers(parsed).map((name) => (
		<ModifierGlyph key={name} name={name} />
	));
	if (parsed.key) parts.push(parsed.key);
	return parts;
};

/**
 * A keyboard shortcut or key, drawn the Platinum way — use it instead of a raw
 * `<kbd>`, which it renders. Pass `shortcut` in any spelling
 * `parseKeyboardShortcut` understands ("Cmd+Shift+S", "Command-O", "⌘N") and
 * it is normalised to the canonical glyph order ⌃⌥⇧⌘ + key, so the same
 * string always reads the same; or pass `children` for a bare key ("Esc").
 *
 * `inline` (default) is the menu-item glyph run — `ClassicyMenu` renders each
 * item's `keyboardShortcut` through this component — and `keycaps` draws one
 * raised key cap per key, for help text and documentation. It renders nothing
 * when the shortcut parses to no keys or there is nothing to show.
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
	const parts = shortcut !== undefined ? shortcutParts(shortcut) : undefined;

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
