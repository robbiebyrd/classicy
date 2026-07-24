import "./ClassicyAssistant.scss";
import { type FC as FunctionalComponent, type ReactNode, useState } from "react";
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
	// player is unused until Task 2; referenced now to establish the hook.
	useSoundDispatch();

	const page = pages[currentPage];
	if (!page) return null;

	return (
		<div className={"classicyAssistant"}>
			<div className={"classicyAssistantHeader"}>
				<span className={"classicyAssistantHeaderTitle"}>{page.title}</span>
			</div>
			<div className={"classicyAssistantBody"}>{page.content}</div>
			<div className={"classicyAssistantFooter"}>
				<div className={"classicyAssistantFooterButtons"} />
				<div className={"classicyAssistantNav"}>
					<span className={"classicyAssistantPageIndicator"}>
						{currentPage + 1}
					</span>
				</div>
			</div>
		</div>
	);
};
