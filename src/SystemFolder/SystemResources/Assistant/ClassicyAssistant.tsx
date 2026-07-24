import "./ClassicyAssistant.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";

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
	initialPage?: number;
	onPageChange?: (index: number) => void;
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const ClassicyAssistant: FunctionalComponent<ClassicyAssistantProps> = ({
	pages,
	buttons,
	initialPage = 0,
	onPageChange,
}) => {
	const lastIndex = Math.max(0, pages.length - 1);
	const [currentPage, setCurrentPage] = useState(() =>
		clamp(initialPage, 0, lastIndex),
	);
	const player = useSoundDispatch();

	const page = pages[currentPage];
	if (!page) return null;

	// Per-page buttons win over the global default; cap at 3 (no silent truncation).
	const resolvedButtons = (page.buttons ?? buttons ?? []).slice();
	if (resolvedButtons.length > MAX_FOOTER_BUTTONS) {
		console.warn(
			`ClassicyAssistant: page "${page.title}" has ${resolvedButtons.length} footer buttons; only the first ${MAX_FOOTER_BUTTONS} are shown.`,
		);
		resolvedButtons.length = MAX_FOOTER_BUTTONS;
	}

	const changePage = (index: number) => {
		const next = clamp(index, 0, lastIndex);
		if (next === currentPage) return;
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		setCurrentPage(next);
		onPageChange?.(next);
	};

	const goNext = () => {
		if (page.canAdvance && page.canAdvance() === false) {
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
				aria-label={page.title}
			>
				{page.labelIcon && (
					<img
						className={"classicyAssistantHeaderLabelIcon"}
						src={page.labelIcon}
						alt={""}
						aria-hidden={true}
					/>
				)}
				<span className={"classicyAssistantHeaderTitle"}>{page.title}</span>
				{page.accessoryIcon && (
					<img
						className={`classicyAssistantAccessoryIcon ${
							accessorySizeClass[page.accessoryIconSize ?? "sm"]
						}`}
						src={page.accessoryIcon}
						alt={""}
						aria-hidden={true}
					/>
				)}
			</section>
			{/* biome-ignore lint/a11y/useSemanticElements: group of arbitrary step content, not a form fieldset */}
			<div
				className={"classicyAssistantBody"}
				role="group"
				aria-label={page.title}
			>
				{page.content}
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
					<button
						type="button"
						aria-label="Previous page"
						className={"classicyAssistantNavButton"}
						disabled={currentPage === 0}
						onClick={goPrev}
					>
						{"◀"}
					</button>
					<span className={"classicyAssistantPageIndicator"}>
						{currentPage + 1}
					</span>
					<button
						type="button"
						aria-label="Next page"
						className={"classicyAssistantNavButton"}
						disabled={currentPage === lastIndex}
						onClick={goNext}
					>
						{"▶"}
					</button>
				</div>
			</div>
		</div>
	);
};
