import "./ClassicyScreenSaverFlyingToasters.scss";
import toastImage from "./toast1.webp";
import toasterSprite from "./toaster-sprite.webp";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const FlyingToastersConfigSchema = z.looseObject({
	toasters: z
		.number()
		.int()
		.min(1)
		.max(37)
		.default(37)
		.describe("How many toasters fly past."),
	toast: z
		.number()
		.int()
		.min(0)
		.max(12)
		.default(12)
		.describe("How many slices of toast fly along."),
});

/**
 * Starting positions from the original: a reverse-"L" of spots just off the
 * top and right edges, in three depth batches so the flow never gaps.
 */
const POSITIONS: Record<string, { right: string; top: string }> = {
	p6: { right: "-2%", top: "-17%" },
	p7: { right: "10%", top: "-19%" },
	p8: { right: "20%", top: "-18%" },
	p9: { right: "30%", top: "-20%" },
	p10: { right: "40%", top: "-21%" },
	p11: { right: "50%", top: "-18%" },
	p12: { right: "60%", top: "-20%" },
	p13: { right: "-17%", top: "10%" },
	p14: { right: "-19%", top: "20%" },
	p15: { right: "-21%", top: "30%" },
	p16: { right: "-23%", top: "50%" },
	p17: { right: "-25%", top: "70%" },
	p18: { right: "0%", top: "-26%" },
	p19: { right: "10%", top: "-20%" },
	p20: { right: "20%", top: "-36%" },
	p21: { right: "30%", top: "-24%" },
	p22: { right: "40%", top: "-33%" },
	p23: { right: "60%", top: "-40%" },
	p24: { right: "-26%", top: "10%" },
	p25: { right: "-36%", top: "30%" },
	p26: { right: "-29%", top: "50%" },
	p27: { right: "0", top: "-46%" },
	p28: { right: "10%", top: "-56%" },
	p29: { right: "20%", top: "-49%" },
	p30: { right: "30%", top: "-60%" },
	p31: { right: "-46%", top: "10%" },
	p32: { right: "-56%", top: "20%" },
	p33: { right: "-49%", top: "30%" },
};

/** Toasters as [speed/delay variant t1–t9, position], in the original order. */
const TOASTERS: [string, string][] = [
	["t1", "p6"],
	["t3", "p7"],
	["t3", "p9"],
	["t1", "p11"],
	["t3", "p12"],
	["t2", "p13"],
	["t1", "p17"],
	["t2", "p21"],
	["t1", "p22"],
	["t1", "p28"],
	["t2", "p31"],
	["t1", "p32"],
	["t4", "p27"],
	["t4", "p10"],
	["t4", "p25"],
	["t4", "p29"],
	["t5", "p15"],
	["t5", "p18"],
	["t5", "p22"],
	["t6", "p6"],
	["t6", "p11"],
	["t6", "p15"],
	["t6", "p19"],
	["t6", "p23"],
	["t7", "p7"],
	["t7", "p12"],
	["t7", "p16"],
	["t7", "p20"],
	["t7", "p24"],
	["t8", "p8"],
	["t8", "p13"],
	["t8", "p17"],
	["t8", "p25"],
	["t9", "p14"],
	["t9", "p18"],
	["t9", "p21"],
	["t9", "p26"],
];

/** Toast as [speed variant tst1–tst4, position], in the original order. */
const TOAST: [string, string][] = [
	["tst1", "p8"],
	["tst3", "p14"],
	["tst2", "p16"],
	["tst2", "p19"],
	["tst3", "p20"],
	["tst1", "p24"],
	["tst2", "p26"],
	["tst2", "p30"],
	["tst3", "p33"],
	["tst4", "p10"],
	["tst4", "p23"],
	["tst4", "p15"],
];

/**
 * Port of After Dark's signature "Flying Toasters" from After Dark in CSS
 * (MIT): chrome toasters flap (4-frame sprite, 64px/frame) diagonally across
 * the screen with slices of toast drifting among them.
 */
export const ClassicyScreenSaverFlyingToasters: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = FlyingToastersConfigSchema.safeParse(config);
	const { toasters, toast } = parsed.success
		? parsed.data
		: { toasters: 37, toast: 12 };
	return (
		<div
			className="classicySaverFlyingToasters"
			style={
				{
					"--classicy-saver-toaster": `url(${toasterSprite})`,
					"--classicy-saver-toast": `url(${toastImage})`,
				} as CSSProperties
			}
		>
			{TOASTERS.slice(0, toasters).map(([variant, pos], i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: the flight plan is static; index is identity
					key={`toaster-${i}`}
					className={`classicySaverFlyingToastersToaster classicySaverFlyingToastersVariant-${variant}`}
					style={POSITIONS[pos]}
				/>
			))}
			{TOAST.slice(0, toast).map(([variant, pos], i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: the flight plan is static; index is identity
					key={`toast-${i}`}
					className={`classicySaverFlyingToastersToast classicySaverFlyingToastersVariant-${variant}`}
					style={POSITIONS[pos]}
				/>
			))}
		</div>
	);
};
