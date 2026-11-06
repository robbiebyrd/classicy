import { describe, expect, it } from "vitest";
import { findAlteredStorybookArt } from "./classicyStorybookArt";

const bytes = (s: string) => Buffer.from(s);

describe("findAlteredStorybookArt", () => {
	it("passes art emitted byte for byte, under a hashed name", () =>
		expect(
			findAlteredStorybookArt(
				[{ name: "resizer.svg", bytes: bytes("<rect/>") }],
				[{ name: "resizer-Ab3_dE-9.svg", bytes: bytes("<rect/>") }],
			),
		).toEqual({ altered: [], checked: ["resizer.svg"] }));

	it("names art whose emitted copy differs (svgo ran)", () =>
		expect(
			findAlteredStorybookArt(
				[{ name: "resizer.svg", bytes: bytes("<rect/>") }],
				[{ name: "resizer-Ab3_dE-9.svg", bytes: bytes("<path/>") }],
			),
		).toEqual({ altered: ["resizer.svg"], checked: ["resizer.svg"] }));

	it("does not mistake a longer name for the same art", () =>
		expect(
			findAlteredStorybookArt(
				[{ name: "arrow.svg", bytes: bytes("a") }],
				[{ name: "arrow-down-Ab3_dE-9.svg", bytes: bytes("b") }],
			),
		).toEqual({ altered: [], checked: [] }));

	it("skips art the build inlined (nothing emitted to compare)", () =>
		expect(
			findAlteredStorybookArt([{ name: "tiny.svg", bytes: bytes("a") }], []),
		).toEqual({ altered: [], checked: [] }));
});
