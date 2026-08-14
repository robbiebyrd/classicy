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
 * hard-coded ball to N. Per-ball X/Y durations are co-prime-ish multiples so
 * paths never sync up, and negative delays start each ball mid-flight.
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
					style={{
						animation: [
							`classicySaverBallMoveX ${(3.4 + i * 0.55).toFixed(2)}s linear ${-(i * 0.9).toFixed(2)}s infinite alternate`,
							`classicySaverBallMoveY ${(3 + i * 0.42).toFixed(2)}s linear ${-(i * 1.3).toFixed(2)}s infinite alternate`,
						].join(", "),
					}}
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
