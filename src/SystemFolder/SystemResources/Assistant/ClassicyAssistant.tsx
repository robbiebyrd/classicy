import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import "./ClassicyAssistant.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useState,
} from "react";
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
	title: string;
	onClick: () => void;
	disabled?: boolean;
}

export interface ClassicyAssistantPage {
	title: string;
	labelIcon?: string;
	accessoryIcon?: string;
	accessoryIconSize?: "sm" | "md" | "lg";
	content: ReactNode;
	buttons?: ClassicyAssistantButton[];
	canAdvance?: () => boolean;
}

export interface ClassicyAssistantProps {
	pages: ClassicyAssistantPage[];
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
	onPageChange?: (index: number) => void;
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const ClassicyAssistant: FunctionalComponent<ClassicyAssistantProps> = ({
	pages,
	buttons,
	initialPage = 0,
	page,
	onPageChange,
}) => {
	const lastIndex = Math.max(0, pages.length - 1);
	const [uncontrolledPage, setUncontrolledPage] = useState(() =>
		clamp(initialPage, 0, lastIndex),
	);
	const player = useSoundDispatch();

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
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
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
		// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so arrow keys work when focus is within the assistant
		<div className={"classicyAssistant"} tabIndex={0} onKeyDown={onKeyDown}>
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
