import "./Calculator.scss";
import {
	type FC as FunctionalComponent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	CALCULATOR_INITIAL_STATE,
	type CalculatorKey,
	type CalculatorState,
	pressCalculatorKey,
} from "@/SystemFolder/Calculator/CalculatorEngine";
import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { useClassicyMenuItemShortcuts } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuItemShortcut";
import { ClassicyOutput } from "@/SystemFolder/SystemResources/Output/ClassicyOutput";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = CALCULATOR_APP_ID;
const APP_NAME = "Calculator";
const WINDOW_ID = "Calculator_1";

type CalculatorButton = {
	/** Unique per button: the keypad has two `=` keys. */
	id: string;
	key: CalculatorKey;
	/** `wide` spans two columns, `tall` two rows. */
	span?: "wide" | "tall";
};

// In reading order. CSS grid auto-placement lays them out as
//   C = / *
//   7 8 9 -
//   4 5 6 +
//   1 2 3 =
//   0 0 . =
// the bottom-right = spanning the last two rows and 0 the first two columns.
const BUTTONS: readonly CalculatorButton[] = [
	{ id: "clear", key: "C" },
	{ id: "equals-top", key: "=" },
	{ id: "divide", key: "/" },
	{ id: "multiply", key: "*" },
	{ id: "7", key: "7" },
	{ id: "8", key: "8" },
	{ id: "9", key: "9" },
	{ id: "subtract", key: "-" },
	{ id: "4", key: "4" },
	{ id: "5", key: "5" },
	{ id: "6", key: "6" },
	{ id: "add", key: "+" },
	{ id: "1", key: "1" },
	{ id: "2", key: "2" },
	{ id: "3", key: "3" },
	{ id: "equals", key: "=", span: "tall" },
	{ id: "0", key: "0", span: "wide" },
	{ id: "decimal", key: "." },
];

/** The button a typed key flashes (the tall `=` for = and Enter). */
const BUTTON_FOR_KEY: Readonly<Record<string, CalculatorButton>> =
	Object.fromEntries(
		BUTTONS.filter((b) => b.id !== "equals-top").map((b) => [b.key, b]),
	);

/** A keyboard key as a Calculator key, or undefined if it is not one. */
export function calculatorKeyFromKeyboard(
	key: string,
): CalculatorKey | undefined {
	switch (key) {
		case "Enter":
			return "=";
		case ",":
			return ".";
		case "Escape":
		case "Clear":
		case "c":
			return "C";
		default:
			return Object.hasOwn(BUTTON_FOR_KEY, key)
				? (key as CalculatorKey)
				: undefined;
	}
}

/** How long a typed key shows its button pressed, in ms. */
const KEY_FLASH_MS = 120;

const isTextEntryTarget = (target: EventTarget | null): boolean =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT");

export const Calculator: FunctionalComponent = () => {
	const appIcon =
		useClassicyAsset("icons", "applications.calculator.app") ?? "";
	const desktopEventDispatch = useAppManagerDispatch();
	const identity = useClassicyAppIdentity(APP_ID, {
		name: APP_NAME,
		icon: appIcon,
	});
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	// The menus' access keys under a package that has them (WIG Appendix B
	// Table B.5: File F, About A, Close C, Help H; Quit unmarked).
	const ak = useClassicyBundledAccessKeys();
	// The user's own Close and Quit keys under a package that lets them be
	// edited (`keyboard.editableShortcuts`; WIG Ch.4 "Shortcut Keys", p.27).
	const shortcut = useClassicyMenuItemShortcuts();
	const windowClose = useClassicyWindowClose(APP_ID);

	const [state, setState] = useState<CalculatorState>(CALCULATOR_INITIAL_STATE);
	const press = (key: CalculatorKey) =>
		setState((current) => pressCalculatorKey(current, key));

	// Typing works while the Calculator's window is the focused one.
	const keyboardActive = useAppManager((s) => {
		const apps = s.System.Manager.Applications;
		const window = getAppWindow(apps.apps[APP_ID], WINDOW_ID);
		return apps.focusedAppId === APP_ID && !!window?.focused && !window.closed;
	});

	const [flashedButtonId, setFlashedButtonId] = useState<string | null>(null);
	const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	useEffect(() => () => clearTimeout(flashTimer.current), []);

	useEffect(() => {
		if (!keyboardActive) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
			if (isTextEntryTarget(e.target)) return;
			// A key reached with Tab presses itself on Enter or Space.
			if (
				(e.key === "Enter" || e.key === " ") &&
				e.target instanceof HTMLElement &&
				e.target.classList.contains("classicyCalculatorKey")
			) {
				return;
			}
			const key = calculatorKeyFromKeyboard(e.key);
			if (!key) return;
			// "/" would open Firefox's quick find; Enter would click a focused key.
			e.preventDefault();
			setState((current) => pressCalculatorKey(current, key));
			setFlashedButtonId(BUTTON_FOR_KEY[key]?.id ?? null);
			clearTimeout(flashTimer.current);
			flashTimer.current = setTimeout(
				() => setFlashedButtonId(null),
				KEY_FLASH_MS,
			);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [keyboardActive]);

	const quit = quitAppHelper(APP_ID, APP_NAME, appIcon);
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			accessKey: ak("f"),
			menuChildren: [
				// Hoisted into the Apple menu by the menu bar (HIG #209).
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				{
					...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
						windowClose(WINDOW_ID, quit),
					),
					accessKey: ak("c"),
					keyboardShortcut: shortcut(`${APP_ID}_close_window`, "⌥W"),
				},
				{ id: "spacer" },
				{
					...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
					accessKey: ak(""),
					keyboardShortcut: shortcut(`${APP_ID}_quit`, "⌥Q"),
				},
			],
		},
	];

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={WINDOW_ID}
			showDesktopIcon={false}
			// A desk accessory: listed in the Apple menu, as in Mac OS 8.
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={identity.name}
				appId={APP_ID}
				icon={identity.icon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={true}
				// Under the default 300 px minimum: a desk accessory is compact.
				initialSize={[200, 0]}
				minimumSize={[200, 0]}
				initialPosition={[320, 80]}
				appMenu={appMenu}
				onCloseFunc={() => desktopEventDispatch(quit)}
			>
				<div className="classicyCalculator">
					{/* An <output>, so screen readers announce each new result. */}
					<ClassicyOutput
						id="classicy-calculator-display"
						variant="inset"
						value={state.display}
						className="classicyCalculatorDisplay"
					/>
					{/* A click leaves focus where it was, as Mac OS 8 keys do:
					    no focus ring after each click, and a later Enter is "=",
					    not another press of the last key clicked. Tab still
					    reaches the keys. */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: mousedown only keeps focus off the keys; each key stays a real, labeled <button> */}
					<div
						className="classicyCalculatorKeypad"
						onMouseDown={(e) => e.preventDefault()}
					>
						{BUTTONS.map((button) => (
							<ClassicyButton
								key={button.id}
								className="classicyCalculatorKey"
								data-span={button.span}
								buttonShape="square"
								depressed={flashedButtonId === button.id}
								// The keypad is typed directly, as Windows 98's Calculator
								// is: its keys carry no access key (calc.exe's captions
								// have no "&").
								accessKey={ak("")}
								onClickFunc={() => press(button.key)}
							>
								{button.key}
							</ClassicyButton>
						))}
					</div>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
};
