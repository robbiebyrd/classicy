import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	resolveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyThemeParseResult } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	classicyThemeLinkPayload,
	classicyThemeLinkRemoteWallpaperHost,
	readClassicyThemeLink,
	withoutClassicyThemeLink,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import { useClassicyThemeLinkOpener } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkAvailability.internal";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { useClassicyBooting } from "@/SystemFolder/SystemResources/Boot/ClassicyBootScreenActive";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Opening a theme link (`#classicy-theme=…`, ClassicyThemeLink.ts) in the
// desktop: ClassicyDesktop's `themeLinks` prop. The link is untrusted input,
// so nothing it holds is used until the user says so:
//
//   1. On mount, and on every `hashchange`, a theme link in the page's
//      fragment is read and validated (readClassicyThemeLink: the theme file
//      schema, the installed-package check). A link that cannot be opened
//      shows a stop alert saying why; while it shows, a change to the
//      package registry reads the link again, so a package a host registers
//      late (Storybook's System 7) still opens it.
//   2. A valid one shows a caution alert naming the theme and its
//      appearance, with Cancel the default. HIGOS8 p.63 makes a caution
//      alert's go-ahead button the default; p.23 allows Cancel when going
//      ahead is at all risky, and accepting untrusted input the user never
//      asked for is. The buttons keep their places (HIGOS8 p.72: the
//      default ring moves, the buttons do not), so Cancel stands left of
//      Add Theme. Nothing is dispatched before Add Theme. A link the user
//      cancels is not asked about again this page load.
//   3. A theme whose desktop picture is a remote http(s) URL then asks a
//      second time, naming the host, with Don't Use the default: showing the
//      picture makes the browser fetch it, telling that host the link was
//      opened. Don't Use imports the theme with no picture (its color).
//   4. The theme is imported as Load Theme… imports a file: a theme of
//      another installed package switches to that package first, then
//      ClassicyDesktopImportTheme adds it as a new custom theme and makes it
//      current.
//
// No alert shows while a boot screen covers the desktop (the pre-boot and
// startup screens, and a host's boot screen that says so:
// ClassicyBootScreenActive.ts, the hold the Notification Manager waits on
// too): one there would take the focus, and the keystrokes the user meant
// for the boot screen. The link is read and held meanwhile, and stays in
// the address.
//
// Whatever the answer, the fragment is removed (history.replaceState) once
// the alert closes, so a reload does not ask again. A page with several
// desktops asks once: the first desktop to see a link claims it, and hands
// it on to the others if it unmounts mid-question.

type ThemeLinkPrompt =
	| { step: "error"; hash: string; payload: string; error: string }
	| { step: "consent"; hash: string; payload: string; theme: ClassicyTheme }
	| {
			step: "picture";
			hash: string;
			payload: string;
			theme: ClassicyTheme;
			host: string;
	  };

/** The desktop (hook instance) handling the page's theme link, if any. */
let themeLinkClaim: symbol | null = null;
/** Every mounted opener's check, to hand a link on when its claimant
 * unmounts mid-question. */
const openerChecks = new Set<() => void>();
/** Payloads the user refused (Cancel) this page load: never asked again. */
const refusedPayloads = new Set<string>();

/** Tests only: forgets refused links and any claim, as a new page load
 * would. */
export const resetClassicyThemeLinkImportForTests = (): void => {
	refusedPayloads.clear();
	themeLinkClaim = null;
};

const ALERT_APP_ID = "Finder.app";

/** Text from a link as an alert shows it (the theme's name, an error naming
 * its package or settings): without control or format characters (bidi
 * overrides, zero-width joiners), which could make the alert's own words
 * read as something else. */
const shownText = (text: string) => text.replace(/[\p{Cc}\p{Cf}]/gu, "");

const packageName = (packageId: string) =>
	getClassicyAppearancePackage(packageId)?.name ?? packageId;

/** The prompt a read link leads to. */
const promptFor = (
	hash: string,
	payload: string,
	result: ClassicyThemeParseResult,
): ThemeLinkPrompt =>
	result.ok
		? { step: "consent", hash, payload, theme: result.theme }
		: { step: "error", hash, payload, error: result.error };

/** Removes `hash` from the address, when it is still there. */
const removeLink = (hash: string) => {
	if (window.location.hash !== hash) return;
	window.history.replaceState(
		window.history.state,
		"",
		withoutClassicyThemeLink(window.location.href),
	);
};

/**
 * Opens theme links while `enabled` (ClassicyDesktop's `themeLinks`):
 * returns the alert to render inside the desktop, or `null`. See above.
 */
export const useClassicyThemeLinkImport = (enabled: boolean): ReactNode => {
	useClassicyThemeLinkOpener(enabled);
	const dispatch = useAppManagerDispatch();
	const booting = useClassicyBooting();
	const packages = useClassicyAppearancePackages();
	const [prompt, setPrompt] = useState<ThemeLinkPrompt | null>(null);
	const promptRef = useRef(prompt);
	promptRef.current = prompt;
	const claim = useRef(Symbol("theme link claim"));
	// Reads the page's link, when there is one and no desktop handles one.
	const checkRef = useRef<() => void>(() => {});

	useEffect(() => {
		if (!enabled) return;
		let mounted = true;
		const release = () => {
			if (themeLinkClaim === claim.current) themeLinkClaim = null;
		};
		const check = () => {
			const hash = window.location.hash;
			const payload = classicyThemeLinkPayload(hash);
			if (payload === null || themeLinkClaim !== null) return;
			if (refusedPayloads.has(payload)) {
				removeLink(hash);
				return;
			}
			themeLinkClaim = claim.current;
			readClassicyThemeLink(hash)
				.then((result) => {
					if (!mounted || themeLinkClaim !== claim.current) return;
					if (!result) {
						release();
						return;
					}
					setPrompt(promptFor(hash, payload, result));
				})
				.catch((error: unknown) => {
					if (mounted) release();
					classicyLog(
						"error",
						"ClassicyThemeLink",
						"The theme link could not be read.",
						error,
					);
				});
		};
		checkRef.current = check;
		openerChecks.add(check);
		check();
		window.addEventListener("hashchange", check);
		return () => {
			mounted = false;
			checkRef.current = () => {};
			openerChecks.delete(check);
			window.removeEventListener("hashchange", check);
			setPrompt(null);
			// Unmounted mid-question: the link stays in the address, and
			// another mounted desktop that opens links takes it (on the next
			// tick, after this commit's own remount, under StrictMode, claims
			// it again).
			if (themeLinkClaim === claim.current) {
				themeLinkClaim = null;
				setTimeout(() => {
					for (const other of openerChecks) other();
				}, 0);
			}
		};
	}, [enabled]);

	// A link refused for an uninstalled package is read again when the
	// registry changes while its alert shows.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the registry is the trigger; the prompt is read from its ref
	useEffect(() => {
		const shown = promptRef.current;
		if (shown?.step !== "error") return;
		let current = true;
		readClassicyThemeLink(shown.hash)
			.then((result) => {
				if (!current || !result || promptRef.current !== shown) return;
				const next = promptFor(shown.hash, shown.payload, result);
				if (next.step === "error" && next.error === shown.error) return;
				setPrompt(next);
			})
			.catch((error: unknown) =>
				classicyLog(
					"error",
					"ClassicyThemeLink",
					"The theme link could not be read again.",
					error,
				),
			);
		return () => {
			current = false;
		};
	}, [packages]);

	/** Closes the alert and removes the link from the address. */
	const finish = useCallback((hash: string) => {
		setPrompt(null);
		removeLink(hash);
		if (themeLinkClaim === claim.current) themeLinkClaim = null;
		// Another link may have arrived while this one was asked about.
		checkRef.current();
	}, []);

	const importTheme = useCallback(
		(hash: string, theme: ClassicyTheme) => {
			// As Load Theme… does: a theme made for another installed package
			// switches to it first, so the active theme and the look agree.
			if (
				theme.package !== resolveClassicyAppearancePackage().id &&
				getClassicyAppearancePackage(theme.package)
			) {
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: theme.package,
				});
			}
			// The reducer validates it again and adds it as a new custom theme.
			dispatch({ type: "ClassicyDesktopImportTheme", theme });
			finish(hash);
		},
		[dispatch, finish],
	);

	// Held, not dropped, while a boot screen covers the desktop.
	if (!prompt || booting) return null;

	if (prompt.step === "error") {
		return (
			<div className={"classicyDesktopDialogOverlay"}>
				<ClassicyAlert
					key={prompt.step}
					id={"classicy_theme_link_error"}
					appId={ALERT_APP_ID}
					alertType={"stop"}
					label={"The theme in this link could not be added."}
					message={shownText(prompt.error)}
					buttons={[
						{
							id: "ok",
							label: "OK",
							role: "default",
							onClick: () => finish(prompt.hash),
						},
					]}
				/>
			</div>
		);
	}

	const { hash, payload, theme } = prompt;
	const name = shownText(theme.name);

	if (prompt.step === "picture") {
		return (
			<div className={"classicyDesktopDialogOverlay"}>
				<ClassicyAlert
					key={prompt.step}
					id={"classicy_theme_link_picture"}
					appId={ALERT_APP_ID}
					alertType={"caution"}
					label={`Use the desktop picture from ${prompt.host}?`}
					message={`The theme “${name}” shows a desktop picture from another website. Using it makes your browser load the picture from ${prompt.host}, which can then tell that you opened this theme. Without it, the desktop shows the theme’s color.`}
					defaultButtonId={"none"}
					buttons={[
						{
							id: "none",
							label: "Don’t Use",
							role: "cancel",
							onClick: () =>
								importTheme(hash, {
									...theme,
									desktop: { ...theme.desktop, backgroundImage: "" },
								}),
						},
						{
							id: "use",
							label: "Use Picture",
							role: "normal",
							onClick: () => importTheme(hash, theme),
						},
					]}
				/>
			</div>
		);
	}

	const themePackage = shownText(packageName(theme.package));
	const switches = theme.package !== resolveClassicyAppearancePackage().id;
	const add = () => {
		const host = classicyThemeLinkRemoteWallpaperHost(theme);
		if (host) setPrompt({ step: "picture", hash, payload, theme, host });
		else importTheme(hash, theme);
	};
	const refuse = () => {
		refusedPayloads.add(payload);
		finish(hash);
	};
	return (
		<div className={"classicyDesktopDialogOverlay"}>
			<ClassicyAlert
				key={prompt.step}
				id={"classicy_theme_link_consent"}
				appId={ALERT_APP_ID}
				alertType={"caution"}
				label={`Add the theme “${name}” from this link?`}
				message={`This link holds a theme for the ${themePackage} appearance. Adding it ${switches ? `switches the appearance to ${themePackage} and ` : ""}makes it the current theme; you can choose another in the Appearance control panel.`}
				defaultButtonId={"cancel"}
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: refuse },
					{ id: "add", label: "Add Theme", role: "normal", onClick: add },
				]}
			/>
		</div>
	);
};
