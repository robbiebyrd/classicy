import "./ClassicyAssistant.scss";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

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

	const goTo = (index: number) => {
		const next = clamp(index, 0, lastIndex);
		if (next === currentPage) return;
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		setCurrentPage(next);
		onPageChange?.(next);
	};

	return (
		<div className={"classicyAssistant"}>
			<div className={"classicyAssistantHeader"}>
				<span className={"classicyAssistantHeaderTitle"}>{page.title}</span>
			</div>
			<div className={"classicyAssistantBody"}>{page.content}</div>
			<div className={"classicyAssistantFooter"}>
				<div className={"classicyAssistantFooterButtons"} />
				<div className={"classicyAssistantNav"}>
					<button
						type="button"
						aria-label="Previous page"
						className={"classicyAssistantNavButton"}
						disabled={currentPage === 0}
						onClick={() => goTo(currentPage - 1)}
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
						onClick={() => goTo(currentPage + 1)}
					>
						{"▶"}
					</button>
				</div>
			</div>
		</div>
	);
};
