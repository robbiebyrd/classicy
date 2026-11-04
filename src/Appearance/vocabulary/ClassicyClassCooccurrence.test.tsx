import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import {
	classicyClassesMeet,
	classicyClassSets,
	classicyStylesheetClasses,
} from "@/Appearance/__tests__/classicyClassCooccurrence";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyButtonToolbar } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";
import { ClassicyHelpButton } from "@/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { CLASSICY_COMPONENT } from "./ClassicyVocabulary";

/**
 * The class co-occurrence the cross-file cascade guard reads
 * (ClassicyCascade.repo.test.ts) is derived from the components' JSX. These
 * pin the derivation's rules on a fixture tree, and pin it against the DOM
 * the real components render: every two classes found together on a
 * rendered element must be ones the derivation says can meet.
 */

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => () => {} }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

describe("classicyClassSets on a fixture tree", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-cooccurrence-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	const write = (rel: string, text: string) => {
		mkdirSync(join(root, rel, ".."), { recursive: true });
		writeFileSync(join(root, rel), text);
	};
	write(
		"Button/ClassicyButton.tsx",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: fixture source text; the `${…}` is the JSX under test, not a placeholder
		'const SIZES = { s: "classicyButtonSizeS" };\nexport const ClassicyButton = ({ big, mode, size, className }) => <button className={classNames("classicyButton", big ? "classicyButtonBig" : "", SIZES[size], `classicyButtonMode${mode}`, className)} />;',
	);
	write(
		"Help/ClassicyHelp.tsx",
		'export const ClassicyHelp = () => <ClassicyButton className="classicyHelp" />;',
	);
	write(
		"Strip/ClassicyStrip.tsx",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: fixture source text; the `${…}` is the JSX under test, not a placeholder
		'export const ClassicyStrip = () => <ClassicyButton className={`classicyStripModule ${x}`} />;\nconst Elsewhere = () => <i className="classicyButton classicyElsewhere" />;',
	);
	write(
		"Help/ClassicyHelp.test.tsx",
		'const t = <div className="classicyHelp classicyTestOnly" />;',
	);
	const meet = classicyClassesMeet(
		classicyClassSets(
			{
				Button: "classicyButton",
				Help: "classicyHelp",
				Strip: "classicyStrip",
			},
			["classicyButtonModeA", "classicyButtonModeB", "classicyOther"],
			root,
		),
	);

	it("pairs the classes of one className expression, every branch included", () =>
		expect(meet("classicyButton", "classicyButtonBig")).toBe(true));

	it("reads the names an expression uses, and expands template prefixes over the known classes", () => {
		expect(meet("classicyButton", "classicyButtonSizeS")).toBe(true);
		expect(meet("classicyButton", "classicyButtonModeA")).toBe(true);
		expect(meet("classicyButtonModeA", "classicyButtonModeB")).toBe(true);
		expect(meet("classicyButton", "classicyOther")).toBe(false);
	});

	it("gives a forwarded className everything the component's root can carry", () => {
		expect(meet("classicyHelp", "classicyButton")).toBe(true);
		expect(meet("classicyHelp", "classicyButtonBig")).toBe(true);
		expect(meet("classicyStripModule", "classicyButtonBig")).toBe(true);
	});

	it("does not pair two forwarders of one component, or a root named elsewhere", () => {
		expect(meet("classicyHelp", "classicyStripModule")).toBe(false);
		// ClassicyStrip.tsx names the root class beside its own class: that
		// element pairs them, but it is not the root's own element, so a help
		// button never gains it.
		expect(meet("classicyButton", "classicyElsewhere")).toBe(true);
		expect(meet("classicyHelp", "classicyElsewhere")).toBe(false);
	});

	it("skips tests and stories", () =>
		expect(meet("classicyHelp", "classicyTestOnly")).toBe(false));
});

describe("classicyClassSets against the rendered DOM", () => {
	const APP = "Cooccurrence.app";
	const app: ClassicyStoreSystemApp = {
		id: APP,
		name: "Cooccurrence",
		icon: "",
		open: true,
		focused: true,
		windows: {},
	};
	beforeEach(() => {
		vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
		vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
		act(() => {
			useAppManager.setState(structuredClone(DefaultAppManagerState), true);
			useAppManager.setState((state) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Applications: {
							...state.System.Manager.Applications,
							apps: { ...state.System.Manager.Applications.apps, [APP]: app },
						},
					},
				},
			}));
		});
	});

	const meet = classicyClassesMeet(
		classicyClassSets(CLASSICY_COMPONENT, classicyStylesheetClasses()),
	);
	/** Every two Classicy classes on one rendered element that do not meet. */
	const unmet = (container: HTMLElement): string[] =>
		[container, ...container.querySelectorAll("*")].flatMap((el) => {
			const classes = [...el.classList].filter((c) => /^classicy[A-Z]/.test(c));
			return classes.flatMap((a) =>
				classes.filter((b) => a < b && !meet(a, b)).map((b) => `${a} + ${b}`),
			);
		});

	it.each([
		[
			"a help button in a large toolbar",
			() => (
				<ClassicyButtonToolbar>
					<ClassicyHelpButton />
				</ClassicyButtonToolbar>
			),
		],
		[
			"a pop-up bevel button",
			() => (
				<ClassicyBevelButton mode="popup" popupArrow="large">
					Menu
				</ClassicyBevelButton>
			),
		],
		[
			"a window with a header",
			() => (
				<ClassicyWindow id="w" appId={APP} title="W" header={<p>head</p>}>
					<p>body</p>
				</ClassicyWindow>
			),
		],
	])("%s", (_name, make) => {
		const { container } = render(make());
		expect(container.querySelector("[class*='classicy']")).not.toBeNull();
		expect(unmet(container)).toEqual([]);
	});
});
