import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import "./ClassicyAssistant.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyPager } from "@/SystemFolder/SystemResources/Pager/ClassicyPager";

const MAX_FOOTER_BUTTONS = 3;

/** Stable React key for a footer button (titles may repeat, so include position). */
const footerButtonKey = (
	button: ClassicyAssistantButton,
	index: number,
): string => `${button.title}-${index}`;

const accessorySizeClass = {
	sm: "classicyAssistantAccessoryIconSm",
	md: "classicyAssistantAccessoryIconMd",
	lg: "classicyAssistantAccessoryIconLg",
} as const;

export interface ClassicyAssistantButton {
	/** Button label. */
	title: string;
	/** Fired when the button is clicked. */
	onClick: () => void;
	/** Dims the button and ignores clicks. */
	disabled?: boolean;
}

export interface ClassicyAssistantPage {
	/** Page heading, shown in the header band (and the page's accessible name). */
	title: string;
	/** Small icon to the left of the title. */
	labelIcon?: string;
	/** Decorative icon at the right of the header, e.g. the assistant's own icon. */
	accessoryIcon?: string;
	/** Size of `accessoryIcon`. Defaults to `"sm"`; `"lg"` overflows the header. */
	accessoryIconSize?: "sm" | "md" | "lg";
	/** The page body. */
	content: ReactNode;
	/** Footer buttons for this page, replacing the assistant-wide `buttons`. */
	buttons?: ClassicyAssistantButton[];
	/**
	 * Gate for moving forward: when it returns `false` the forward arrow
	 * (and →) plays the error sound instead of advancing. Going back is never
	 * gated.
	 */
	canAdvance?: () => boolean;
}

export interface ClassicyAssistantProps {
	/** The pages, in order. Renders nothing when empty. */
	pages: ClassicyAssistantPage[];
	/**
	 * Default footer buttons (e.g. Cancel) for pages without their own
	 * `buttons`. At most three are shown; extras are dropped with a warning.
	 */
	buttons?: ClassicyAssistantButton[];
	/**
	 * Uncontrolled starting page (zero-based), clamped to the page range.
	 * Ignored when `page` is supplied.
	 */
	initialPage?: number;
	/**
	 * Controlled current page (zero-based). When supplied the component never
	 * changes pages on its own: it renders this value (clamped to the page
	 * range) and reports every navigation through `onPageChange`, so the owner
	 * decides whether the move happens. Omit it to keep the uncontrolled
	 * behaviour, where the assistant tracks the page itself from `initialPage`.
	 */
	page?: number;
	/**
	 * Fired with the requested zero-based page index on every navigation,
	 * controlled or not (only after `canAdvance` allows a forward move).
	 */
	onPageChange?: (index: number) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

/**
 * A paged assistant in the style of the Mac OS Setup Assistant and Apple
 * Guide: a header band with the page title and optional icons, the page
 * content, and a footer with up to three push buttons and a `ClassicyPager`
 * (back arrow, page number, forward arrow). Place it inside a
 * `ClassicyWindow`; Classicy's own Apple Guide window (`AppleGuideWindow`,
 * the Help menu's "About Balloon Help…") is built on it.
 *
 * Page changes play `ClassicyTabClickUp` under Platinum (its `change` hook);
 * the → and ← keys page while focus is inside the assistant. A page's
 * `canAdvance` can refuse a forward move, which plays the error sound
 * instead. Uncontrolled by default (starting at
 * `initialPage`); pass `page` + `onPageChange` to own the current page.
 *
 * ```tsx
 * <ClassicyWindow id="setup" appId={appId} title="Setup Assistant">
 *     <ClassicyAssistant
 *         buttons={[{ title: "Cancel", onClick: close }]}
 *         pages={[
 *             { title: "Introduction", content: <p>Welcome!</p> },
 *             { title: "Conclusion", content: <p>Done.</p>, buttons: [{ title: "Done", onClick: close }] },
 *         ]}
 *     />
 * </ClassicyWindow>
 * ```
 */
export const ClassicyAssistant: FunctionalComponent<ClassicyAssistantProps> = ({
	pages,
	buttons,
	initialPage = 0,
	page,
	onPageChange,
	className,
	style,
}) => {
	const lastIndex = Math.max(0, pages.length - 1);
	const [uncontrolledPage, setUncontrolledPage] = useState(() =>
		clamp(initialPage, 0, lastIndex),
	);
	const player = useSoundDispatch();
	const rootRef = useRef<HTMLDivElement>(null);
	const appearance = useClassicyAppearance("Assistant", {}, rootRef);

	const isControlled = page !== undefined;
	const currentPage = clamp(
		isControlled ? page : uncontrolledPage,
		0,
		lastIndex,
	);

	const activePage = pages[currentPage];
	if (!activePage) return null;

	// Per-page buttons win over the global default; cap at 3 (no silent truncation).
	const resolvedButtons = (activePage.buttons ?? buttons ?? []).slice();
	if (resolvedButtons.length > MAX_FOOTER_BUTTONS) {
		classicyLog(
			"warn",
			"ClassicyAssistant",
			`page "${activePage.title}" has ${resolvedButtons.length} footer buttons; only the first ${MAX_FOOTER_BUTTONS} are shown.`,
		);
		resolvedButtons.length = MAX_FOOTER_BUTTONS;
	}

	const changePage = (index: number) => {
		const next = clamp(index, 0, lastIndex);
		if (next === currentPage) return;
		// The pager's arrows and the arrow keys both land here.
		appearance.emit("change", withClassicyAppearanceInput({ page: next }));
		if (!isControlled) setUncontrolledPage(next);
		onPageChange?.(next);
	};

	const goNext = () => {
		if (activePage.canAdvance && activePage.canAdvance() === false) {
			player({ type: "ClassicySoundPlayError" });
			return;
		}
		changePage(currentPage + 1);
	};

	const goPrev = () => changePage(currentPage - 1);

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "ArrowRight") {
			e.preventDefault();
			goNext();
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			goPrev();
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: wizard container is a focusable arrow-key nav surface
		<div
			{...appearance.attrs}
			ref={rootRef}
			className={classNames(
				"classicyAssistant",
				appearance.className,
				className,
			)}
			style={appearance.style ? { ...appearance.style, ...style } : style}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so arrow keys work when focus is within the assistant
			tabIndex={0}
			onKeyDown={onKeyDown}
		>
			<section
				className={"classicyAssistantHeader"}
				aria-live="polite"
				aria-label={activePage.title}
			>
				{activePage.labelIcon && (
					<img
						className={"classicyAssistantHeaderLabelIcon"}
						src={activePage.labelIcon}
						alt={""}
						aria-hidden={true}
					/>
				)}
				<span className={"classicyAssistantHeaderTitle"}>
					{activePage.title}
				</span>
				{activePage.accessoryIcon && (
					<img
						className={`classicyAssistantAccessoryIcon ${
							accessorySizeClass[activePage.accessoryIconSize ?? "sm"]
						}`}
						src={activePage.accessoryIcon}
						alt={""}
						aria-hidden={true}
					/>
				)}
			</section>
			{/* biome-ignore lint/a11y/useSemanticElements: group of arbitrary step content, not a form fieldset */}
			<div
				className={"classicyAssistantBody"}
				role="group"
				aria-label={activePage.title}
			>
				{activePage.content}
			</div>
			<div className={"classicyAssistantFooter"}>
				<div className={"classicyAssistantFooterButtons"}>
					{resolvedButtons.map((btn, i) => (
						<ClassicyButton
							key={footerButtonKey(btn, i)}
							buttonSize="small"
							disabled={btn.disabled}
							onClickFunc={btn.onClick}
						>
							{btn.title}
						</ClassicyButton>
					))}
				</div>
				<div className={"classicyAssistantNav"}>
					{/* The pager only ever asks for an adjacent page, so route its
					    request through the same gated handlers the arrow keys use. */}
					<ClassicyPager
						page={currentPage}
						pageCount={pages.length}
						onPageChange={(next) => (next > currentPage ? goNext() : goPrev())}
						pageClassName={"classicyAssistantPageIndicator"}
					/>
				</div>
			</div>
		</div>
	);
};
