import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * Every stylesheet under src resolves its states by source order and
 * specificity, never by `!important`, so a theme package (or a consumer's own
 * rule) can override any of them by the cascade alone. jsdom does no cascade,
 * so the rule order and the raised selectors that replaced `!important` are
 * pinned on the compiled stylesheets.
 */

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), "src/SystemFolder", file), {
		style: "expanded",
	}).css;

const ruleAt = (css: string, selector: string): number => {
	const i = `\n${css}`.indexOf(`\n${selector} {`);
	if (i < 0) throw new Error(`no rule for ${selector}`);
	return i;
};

const rule = (css: string, selector: string): Record<string, string> => {
	const start = ruleAt(css, selector);
	const body = `\n${css}`.slice(start).split("{")[1].split("}")[0];
	return Object.fromEntries(
		body
			.split(";")
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => {
				const [prop, ...rest] = d.split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

describe("repo-wide cascade hygiene", () => {
	it("no SCSS under src uses !important", () => {
		const files = globSync("src/**/*.scss");
		const hits = files.flatMap((f) =>
			readFileSync(f, "utf8")
				.split("\n")
				.map((l, i) => (l.includes("!important") ? `${f}:${i + 1}` : null))
				.filter(Boolean),
		);
		expect(hits).toEqual([]);
	});
});

describe("rules that replaced !important", () => {
	it("desktop icons: the alias badge's mask size follows the base mask", () => {
		const css = compile("SystemResources/Desktop/ClassicyDesktopIcon.scss");
		expect(
			ruleAt(css, ".classicyDesktopIconAliasBadge .classicyDesktopIconMask"),
		).toBeGreaterThan(ruleAt(css, ".classicyDesktopIconMask"));
		expect(
			rule(css, ".classicyDesktopIconAliasBadge .classicyDesktopIconMask")[
				"mask-size"
			],
		).toBe("100%");
	});

	it("icons: stacking is the base rule's 10 and the drag's 500 only", () => {
		for (const [file, root] of [
			[
				"SystemResources/Desktop/ClassicyDesktopIcon.scss",
				"classicyDesktopIcon",
			],
			["SystemResources/Icon/ClassicyIcon.scss", "classicyIcon"],
		]) {
			const css = compile(file);
			expect(rule(css, `.${root}`)["z-index"]).toBe("10");
			expect(rule(css, `:where(.${root}).dragging`)["z-index"]).toBe("500");
			expect(css.match(/z-index/g)).toHaveLength(2);
		}
	});

	it("desktop icons never draw the desktop's focus ring", () => {
		const css = compile("SystemResources/Desktop/ClassicyDesktopIcon.scss");
		expect(
			rule(css, ".classicyDesktop .classicyDesktopIcon:focus-visible").outline,
		).toBe("none");
	});

	it("menus: keyboard equivalents and disabled items beat the generic rules", () => {
		const css = compile("SystemResources/Menu/ClassicyMenu.scss");
		expect(
			rule(css, ".classicyMenuItem .classicyMenuItemKeyboardShortcut")[
				"font-size"
			],
		).toBe("calc(var(--ui-font-size) * 0.75)");
		expect(
			rule(css, ".classicyMenuItem.disabled:hover")["background-color"],
		).toBe("transparent");
	});

	it("menu bar widgets never highlight", () => {
		for (const [file, part] of [
			[
				"SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss",
				"classicyDesktopMenuTime",
			],
			[
				"SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.scss",
				"classicyDesktopMenuWidgetSound",
			],
		])
			expect(
				rule(compile(file), `.classicyDesktopMenu .${part}:hover`).background,
			).toBe("transparent");
	});

	it("the text editor's auto height follows its base height", () => {
		const css = compile("SystemResources/TextEditor/ClassicyTextEditor.scss");
		expect(ruleAt(css, ".classicyTextEditorAutoHeight")).toBeGreaterThan(
			ruleAt(css, ".classicyTextEditor"),
		);
	});

	it("the mini pop-up's square size outranks the control's own", () => {
		const css = compile("SystemResources/PopUpMenu/ClassicyPopUpMenu.scss");
		expect(
			rule(css, ".classicyPopUpMenu.classicyPopUpMenuSizeMini").width,
		).toBe("calc(var(--window-control-size) * 1.3125)");
	});

	it("disabled checkboxes and default radio buttons keep their borders", () => {
		// The checkbox borders are the Platinum package's (B 4.3a): its
		// partial's rules, compiled unscoped.
		const checkbox = sass.compileString(
			'@use "Appearance/Platinum/styles/components/Checkbox";\n@include Checkbox.checkbox;',
			{ style: "expanded", loadPaths: [path.resolve(process.cwd(), "src")] },
		).css;
		expect(
			ruleAt(checkbox, ".classicyCheckbox.default:disabled"),
		).toBeGreaterThan(
			ruleAt(
				checkbox,
				".classicyCheckbox.default:checked, .classicyCheckbox.default:active",
			),
		);
		// Radio: the shared `:where(.root).state` form throughout, so the
		// default rule wins by order at (0,2,0), not by a third class.
		const radio = compile("SystemResources/RadioInput/ClassicyRadioInput.scss");
		const radioDefault = ruleAt(
			radio,
			":where(.classicyRadioInput).default:checked, :where(.classicyRadioInput).default:active",
		);
		const disabledChecked = ruleAt(
			radio,
			":where(.classicyRadioInput):disabled:checked",
		);
		expect(disabledChecked).toBeGreaterThan(
			ruleAt(radio, ".classicyRadioInput:checked"),
		);
		expect(radioDefault).toBeGreaterThan(disabledChecked);
		expect(radioDefault).toBeGreaterThan(
			ruleAt(radio, ":where(.classicyRadioInput.mixed):disabled:checked"),
		);
		expect(radio).not.toMatch(/\.classicyRadioInput\.default/);
	});

	it("bouncing balls keep their per-ball timing in the stylesheet", () => {
		const css = compile(
			"Extensions/ScreenSaver/savers/BouncingBall/ClassicyScreenSaverBouncingBall.scss",
		);
		for (let i = 0; i < 12; i++) {
			const animation = rule(
				css,
				`.classicySaverBouncingBallBall:nth-child(${i + 1})`,
			).animation;
			const seconds = animation.match(/-?[\d.]+s/g)?.map(Number.parseFloat);
			// The timing the component used to write inline, ball by ball.
			expect(seconds).toEqual([
				Number((3.4 + i * 0.55).toFixed(2)),
				-Number((i * 0.9).toFixed(2)) || 0,
				Number((3 + i * 0.42).toFixed(2)),
				-Number((i * 1.3).toFixed(2)) || 0,
			]);
		}
	});

	it("the screen saver's overrides key on the overlay's id", () => {
		const css = compile("Extensions/ScreenSaver/ClassicyScreenSaver.scss");
		expect(css).toContain(
			"html.classicyScreenSaverActive:has(#classicy-screen-saver-overlay) *",
		);
		expect(css).toContain("#classicy-screen-saver-overlay *");
	});
});
