import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import { createWindows98Random } from "../windows98SaverTimer";
import { pipes } from "./pipes";
// The .scr's own texture (its resource 100/99, a 100 x 100 bitmap of red and
// white stripes), drawn on a Textured pipe.
import pipesTexture from "./pipes-texture.webp";

/**
 * 3D Pipes' options, as its dialog had them ("3D Pipes Setup"): Pipes, Single
 * or Multiple; Pipe Style, Traditional (with its Joint Type: Elbow, Ball,
 * Mixed or Cycle) or Flex; Resolution, a Min to Max slider (0-200); and
 * Surface Style, Solid or Textured. Textured draws the .scr's own striped
 * texture; its Choose Texture button, which picked a bitmap from the disk, has
 * no counterpart here. The defaults are the .scr's own (every setting 0:
 * Single, Traditional, Elbow, Min, Solid).
 */
export const PipesConfigSchema = z.looseObject({
	pipes: z.enum(["Single", "Multiple"]).default("Single").describe("Pipes"),
	pipeStyle: z
		.enum(["Traditional", "Flex"])
		.default("Traditional")
		.describe("Pipe style"),
	jointType: z
		.enum(["Elbow", "Ball", "Mixed", "Cycle"])
		.default("Elbow")
		.describe("Joint type"),
	resolution: z
		.number()
		.int()
		.min(0)
		.max(200)
		.default(0)
		.describe("Resolution (0 min, 200 max)"),
	surfaceStyle: z
		.enum(["Solid", "Textured"])
		.default("Solid")
		.describe("Surface style"),
});

/**
 * Windows 98's 3D Pipes (sspipes.scr, one of its OpenGL screen savers): pipes
 * growing through space in shiny materials, the picture dissolving to black
 * and starting over. Drawn with WebGL; without it, the screen stays black.
 */
export const ClassicyScreenSaverPipes: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = PipesConfigSchema.safeParse(config);
	const options = parsed.success ? parsed.data : PipesConfigSchema.parse({});
	const settings = {
		multiple: options.pipes === "Multiple",
		flex: options.pipeStyle === "Flex",
		jointType: options.jointType,
		resolution: options.resolution,
		texture: options.surfaceStyle === "Textured" ? String(pipesTexture) : null,
	};
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverPipes"
			className={className}
			style={style}
			optionsKey={JSON.stringify(settings)}
			setup={{
				// One node a timer tick.
				intervalMs: 0,
				stillTicks: 0,
				start: (canvas, width, height) =>
					pipes(canvas, width, height, createWindows98Random(), settings),
			}}
		/>
	);
};
