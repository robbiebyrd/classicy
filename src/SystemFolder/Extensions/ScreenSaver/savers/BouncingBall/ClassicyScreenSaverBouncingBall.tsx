import "./ClassicyScreenSaverBouncingBall.scss";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import type {
	ClassicyScreenSaverConfigProps,
	ClassicyScreenSaverProps,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";

export const BouncingBallConfigSchema = z.looseObject({
	balls: z
		.number()
		.int()
		.min(1)
		.max(12)
		.default(3)
		.describe("Number of bouncing balls."),
});

const ballCount = (config: Record<string, unknown>): number => {
	const parsed = BouncingBallConfigSchema.safeParse(config);
	return parsed.success ? parsed.data.balls : 3;
};

/**
 * Port of After Dark in CSS "Bouncing Ball" (MIT), generalized from one
 * hard-coded ball to N. Each ball's timing lives in the stylesheet
 * (`:nth-child`), so the overlay's reduced-motion rule can pause it.
 */
export const ClassicyScreenSaverBouncingBall: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const count = ballCount(config);
	return (
		<div className="classicySaverBouncingBall">
			{Array.from({ length: count }, (_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: balls are identical; position is identity
					key={i}
					className="classicySaverBouncingBallBall"
				/>
			))}
		</div>
	);
};

/** Reference custom options UI: a single spinner, host-persisted via onChange. */
export const ClassicyScreenSaverBouncingBallOptions: FunctionalComponent<
	ClassicyScreenSaverConfigProps
> = ({ config, onChange }) => (
	<ClassicySpinner
		id="ScreenSaver_BouncingBall_balls"
		labelTitle="Balls"
		labelPosition="left"
		minValue={1}
		maxValue={12}
		prefillValue={ballCount(config)}
		onChangeFunc={(e) => {
			const balls = Number.parseInt(e.target.value, 10);
			if (Number.isFinite(balls)) onChange({ balls });
		}}
	/>
);
