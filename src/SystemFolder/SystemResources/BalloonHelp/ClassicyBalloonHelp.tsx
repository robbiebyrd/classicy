import "./ClassicyBalloonHelp.scss";
import type { FC, PropsWithChildren } from "react";
import { useRef } from "react";
import {
	type ClassicyBalloonPosition,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

export type { ClassicyBalloonPosition };

interface ClassicyBalloonHelpProps extends PropsWithChildren {
	title?: string;
	content: string;
	delay?: number;
	position?: ClassicyBalloonPosition;
	className?: string;
}

export const ClassicyBalloonHelp: FC<ClassicyBalloonHelpProps> = ({
	children,
	title,
	content,
	delay,
	position,
	className,
}) => {
	const anchorRef = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(anchorRef, {
		title,
		content,
		delay,
		position,
	});

	return (
		<div
			ref={anchorRef}
			role="tooltip"
			className={["classicyBalloonHelpAnchor", className]
				.filter(Boolean)
				.join(" ")}
			{...handlers}
		>
			{children}
			{balloon}
		</div>
	);
};
