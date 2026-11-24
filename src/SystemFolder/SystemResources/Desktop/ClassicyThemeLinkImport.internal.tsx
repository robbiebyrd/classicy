import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { resolveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	classicyThemeLinkPayload,
	classicyThemeLinkRemoteWallpaperHost,
	readClassicyThemeLink,
	withoutClassicyThemeLink,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import { useClassicyThemeLinkOpener } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkAvailability.internal";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";

// Opening a theme link (`#classicy-theme=…`, ClassicyThemeLink.ts) in the
// desktop: ClassicyDesktop's `themeLinks` prop. The link is untrusted input,
// so nothing it holds is used until the user says so:
//
//   1. On mount, and on every `hashchange`, a theme link in the page's
//      fragment is read and validated (readClassicyThemeLink: the theme file
//      schema, the installed-package check). A link that cannot be opened
//      shows a stop alert saying why.
//   2. A valid one shows a caution alert naming the theme and its
//      appearance, with Cancel the default. HIGOS8 p.63 makes a caution
//      alert's go-ahead button the default; p.23 allows Cancel when going
//      ahead is at all risky, and accepting untrusted input the user never
//      asked for is: the alert can open behind the startup screen, where a
//      stray Return must not accept it. Nothing is dispatched before Add
//      Theme.
//   3. A theme whose desktop picture is a remote http(s) URL then asks a
//      second time, naming the host, with Don't Use the default: showing the
//      picture makes the browser fetch it, telling that host the link was
//      opened. Don't Use imports the theme with no picture (its color).
//   4. The theme is imported as Load Theme… imports a file: a theme of
//      another installed package switches to that package first, then
//      ClassicyDesktopImportTheme adds it as a new custom theme and makes it
//      current.
//
// Whatever the answer, the fragment is removed (history.replaceState) once
// the alert closes, so a reload does not ask again. A page with several
// desktops asks once: the first desktop to see a link claims it.

type ThemeLinkPrompt =
	| { step: "error"; hash: string; error: string }
	| { step: "consent"; hash: string; theme: ClassicyTheme }
	| { step: "picture"; hash: string; theme: ClassicyTheme; host: string };

/** The desktop (hook instance) handling the page's theme link, if any. */
let themeLinkClaim: symbol | null = null;

const ALERT_APP_ID = "Finder.app";

/** A theme's name as an alert shows it: without control or format
 * characters (bidi overrides, zero-width joiners), which could make the
 * alert's own words read as something else. */
const displayedThemeName = (name: string) =>
	name.replace(/[\p{Cc}\p{Cf}]/gu, "");

const packageName = (packageId: string) =>
	getClassicyAppearancePackage(packageId)?.name ?? packageId;

/**
 * Opens theme links while `enabled` (ClassicyDesktop's `themeLinks`):
 * returns the alert to render inside the desktop, or `null`. See above.
 */
export const useClassicyThemeLinkImport = (enabled: boolean): ReactNode => {
	useClassicyThemeLinkOpener(enabled);
	const dispatch = useAppManagerDispatch();
	const [prompt, setPrompt] = useState<ThemeLinkPrompt | null>(null);
	const claim = useRef(Symbol("theme link claim"));
	// Reads the page's link, when there is one and no desktop handles one.
	const checkRef = useRef<() => void>(() => {});

	useEffect(() => {
		if (!enabled) return;
		let mounted = true;
		const check = () => {
			const hash = window.location.hash;
			if (classicyThemeLinkPayload(hash) === null) return;
			if (themeLinkClaim !== null) return;
			themeLinkClaim = claim.current;
			void readClassicyThemeLink(hash).then((result) => {
				if (!mounted || themeLinkClaim !== claim.current) return;
				if (!result) {
					themeLinkClaim = null;
					return;
				}
				setPrompt(
					result.ok
						? { step: "consent", hash, theme: result.theme }
						: { step: "error", hash, error: result.error },
				);
			});
		};
		checkRef.current = check;
		check();
		window.addEventListener("hashchange", check);
		return () => {
			mounted = false;
			checkRef.current = () => {};
			window.removeEventListener("hashchange", check);
			// Unmounted mid-question: the link stays in the address, for the
			// next desktop (or this one, remounted) to ask about.
			if (themeLinkClaim === claim.current) themeLinkClaim = null;
			setPrompt(null);
		};
	}, [enabled]);

	/** Closes the alert and removes the link from the address. */
	const finish = useCallback((hash: string) => {
		setPrompt(null);
		if (window.location.hash === hash) {
			window.history.replaceState(
				window.history.state,
				"",
				withoutClassicyThemeLink(window.location.href),
			);
		}
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

	if (!prompt) return null;

	if (prompt.step === "error") {
		return (
			<div className={"classicyDesktopDialogOverlay"}>
				<ClassicyAlert
					key={prompt.step}
					id={"classicy_theme_link_error"}
					appId={ALERT_APP_ID}
					alertType={"stop"}
					label={"The theme in this link could not be added."}
					message={prompt.error}
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

	const { hash, theme } = prompt;
	const name = displayedThemeName(theme.name);

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

	const themePackage = packageName(theme.package);
	const switches = theme.package !== resolveClassicyAppearancePackage().id;
	const add = () => {
		const host = classicyThemeLinkRemoteWallpaperHost(theme);
		if (host) setPrompt({ step: "picture", hash, theme, host });
		else importTheme(hash, theme);
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
					{
						id: "cancel",
						label: "Cancel",
						role: "cancel",
						onClick: () => finish(hash),
					},
					{ id: "add", label: "Add Theme", role: "normal", onClick: add },
				]}
			/>
		</div>
	);
};
