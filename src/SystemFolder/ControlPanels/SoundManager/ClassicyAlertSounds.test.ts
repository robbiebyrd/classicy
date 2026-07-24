import { describe, expect, it } from "vitest";
import {
	CLASSICY_ALERT_SOUNDS,
	DEFAULT_ALERT_SOUND,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";

describe("ClassicyAlertSounds", () => {
	it("defaults to Sosumi", () => {
		expect(DEFAULT_ALERT_SOUND).toBe("ClassicyAlertSosumi");
	});

	it("lists all seven ClassicyAlert sounds", () => {
		expect(CLASSICY_ALERT_SOUNDS).toHaveLength(7);
		expect(CLASSICY_ALERT_SOUNDS.map((s) => s.value)).toEqual([
			"ClassicyAlertBonk",
			"ClassicyAlertGrowl",
			"ClassicyAlertIndigo",
			"ClassicyAlertQuack",
			"ClassicyAlertSosumi",
			"ClassicyAlertTabitha",
			"ClassicyAlertWildEep",
		]);
	});

	it("includes the default in the list", () => {
		expect(
			CLASSICY_ALERT_SOUNDS.some((s) => s.value === DEFAULT_ALERT_SOUND),
		).toBe(true);
	});
});
