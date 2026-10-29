import "./ClassicyScreenSaverWarp.scss";
import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import stars1 from "./stars1.webp";
import stars2 from "./stars2.webp";
import stars3 from "./stars3.webp";
import stars4 from "./stars4.webp";

export const WarpConfigSchema = z.looseObject({
	layers: z.number().int().min(3).max(9).default(9).describe("Star density"),
});

const starImages = [stars1, stars2, stars3, stars4].map(String);

/**
 * Port of After Dark in CSS "Warp" (MIT), via Keith Clark's starfield: layers
 * of star PNGs scale up from the center on staggered 500 ms delays. Fewer
 * layers = sparser bursts.
 */
export const ClassicyScreenSaverWarp: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = WarpConfigSchema.safeParse(config);
	const layers = parsed.success ? parsed.data.layers : 9;
	return (
		<div className={classNames("classicySaverWarp", className)} style={style}>
			{Array.from({ length: layers }, (_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: layers are identical; stagger index is identity
					key={i}
					className="classicySaverWarpStars"
					style={
						{
							"--classicy-saver-warp-stars": `url(${starImages[i % starImages.length]})`,
							animationDelay: `${i * 500}ms`,
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
};
