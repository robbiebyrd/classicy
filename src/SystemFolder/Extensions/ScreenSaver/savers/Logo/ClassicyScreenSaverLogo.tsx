import "./ClassicyScreenSaverLogo.scss";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type SyntheticEvent,
	useState,
} from "react";
import { z } from "zod";
import type {
	ClassicyScreenSaverConfigProps,
	ClassicyScreenSaverProps,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import {
	CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID,
	type ClassicyScreenSaverLogoDefinition,
	resolveClassicyScreenSaverLogo,
	useClassicyScreenSaverLogos,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Logo/ClassicyScreenSaverLogoRegistry";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

export const LogoConfigSchema = z.looseObject({
	logo: z
		.string()
		.default(CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID)
		.describe("Logo"),
});

/**
 * The logo a saved config names, or the default: the registry is consulted
 * at render time because a third-party logo may be registered after the
 * config was saved — or never again, in which case the default stands in.
 */
const selectedLogo = (
	config: Record<string, unknown>,
): ClassicyScreenSaverLogoDefinition | undefined => {
	const parsed = LogoConfigSchema.safeParse(config);
	return resolveClassicyScreenSaverLogo(
		parsed.success ? parsed.data.logo : undefined,
	);
};

type LogoSize = { width: number; height: number };

const declaredSize = (
	logo: ClassicyScreenSaverLogoDefinition,
): LogoSize | undefined =>
	logo.width !== undefined && logo.height !== undefined
		? { width: logo.width, height: logo.height }
		: undefined;

/**
 * Port of After Dark in CSS "Logo" (MIT): a mark bouncing around the screen.
 * Which mark is the saver's one option — the Berkeley Systems original by
 * default, or any logo added with `registerClassicyScreenSaverLogo`.
 *
 * The bounce keyframes travel from edge to edge by subtracting the mark's
 * size from the viewport, so the size is published as CSS custom properties:
 * from the definition when it declares both dimensions, otherwise measured
 * once the image has loaded (its natural size, or the declared dimension
 * with the other derived by the browser).
 */
export const ClassicyScreenSaverLogo: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const logo = selectedLogo(config);
	const [measured, setMeasured] = useState<LogoSize | undefined>();
	if (!logo) return <div className="classicySaverLogo" />;
	const size = declaredSize(logo) ?? measured;
	const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
		if (declaredSize(logo)) return;
		const rect = e.currentTarget.getBoundingClientRect();
		setMeasured({ width: rect.width, height: rect.height });
	};
	return (
		<div className="classicySaverLogo">
			<img
				// Remount per logo so a stale measurement never applies to the
				// next image.
				key={logo.id}
				className="classicySaverLogoMark"
				src={logo.src}
				alt=""
				width={logo.width}
				height={logo.height}
				onLoad={onLoad}
				style={
					{
						"--classicy-saver-logo-width": `${size?.width ?? 0}px`,
						"--classicy-saver-logo-height": `${size?.height ?? 0}px`,
					} as CSSProperties
				}
			/>
		</div>
	);
};

/**
 * The saver's options: a pop-up menu of every registered logo. A custom
 * `configComponent` rather than a schema enum because the list is live — a
 * host registers logos at module scope, possibly after the saver did.
 */
export const ClassicyScreenSaverLogoOptions: FunctionalComponent<
	ClassicyScreenSaverConfigProps
> = ({ config, onChange }) => {
	const logos = useClassicyScreenSaverLogos();
	const selected = selectedLogo(config);
	return (
		<ClassicyPopUpMenu
			id="ScreenSaver_Logo_logo"
			label="Logo"
			labelPosition="left"
			options={logos.map((logo) => ({ value: logo.id, label: logo.name }))}
			selected={selected?.id ?? ""}
			onChangeFunc={(e) => onChange({ logo: e.target.value })}
		/>
	);
};
