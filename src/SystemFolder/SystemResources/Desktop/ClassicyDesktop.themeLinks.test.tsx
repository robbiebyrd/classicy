// The core registers no Appearance Package: these tests draw Platinum, and
// open System 7's themes too.
import "@/__tests__/withPlatinum";
import "@classicy/appearance-system7";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { compactClassicyThemeFile } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	CLASSICY_THEME_LINK_KEY,
	CLASSICY_THEME_LINK_MAX_LENGTH,
	createClassicyThemeLink,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import { encodeClassicyThemeLinkPayload } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkCodec.internal";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";
import { useClassicyThemeLinkImport } from "@/SystemFolder/SystemResources/Desktop/ClassicyThemeLinkImport.internal";

// Whole-desktop integration tests, as the theme file ones: each boots the
// desktop, so each gets the same headroom over vitest's 5 s default.
const INTEGRATION_TIMEOUT_MS = 15_000;

const appearance = () => useAppManager.getState().System.Manager.Appearance;

const PAGE = `${window.location.origin}/desktop/?tab=1`;

const oceanTheme = (): ClassicyTheme => ({
	...structuredClone(getTheme("bondi")),
	id: "x",
	name: "Ocean",
});

/** The address bar, set as a visitor's browser would open the link. */
const visit = (url: string) => window.history.replaceState(null, "", url);

const linkTo = async (theme: ClassicyTheme): Promise<string> => {
	const result = await createClassicyThemeLink(theme, PAGE);
	if (!result.ok) throw new Error(result.error);
	return result.url;
};

/** A link whose payload is `text`, deflated as a link carries it. */
const linkHolding = (text: string) =>
	`${PAGE}#${CLASSICY_THEME_LINK_KEY}=${encodeClassicyThemeLinkPayload(text)}`;

const mount = (themeLinks?: boolean) =>
	render(
		<Classicy
			startupScreen={false}
			controlStrip={false}
			themeLinks={themeLinks}
		/>,
	);

const findAlert = (label: string | RegExp) =>
	screen.findByRole("alertdialog", { name: label });

const press = (alert: HTMLElement, name: string) =>
	fireEvent.click(within(alert).getByRole("button", { name }));

const noAlert = () =>
	waitFor(() => {
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

/** Lets the link's lazy codec load and its read settle. */
const settle = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

const openAppearanceManager = async () => {
	await waitFor(() => {
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				APPEARANCE_MANAGER_APP_ID
			],
		).toBeDefined();
	});
	act(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: {
				id: APPEARANCE_MANAGER_APP_ID,
				name: "Appearance Manager",
				icon: "",
			},
		});
	});
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	await within(win).findByRole("button", { name: "Load Theme…" });
	return win;
};

describe("ClassicyDesktop themeLinks", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		visit("/");
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		visit("/");
	});

	it("is off by default: the fragment is ignored and left in the address", async () => {
		const url = await linkTo(oceanTheme());
		visit(url);
		mount();
		const win = await openAppearanceManager();
		await settle();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(window.location.href).toBe(url);
		expect(appearance().customThemes ?? []).toHaveLength(0);
		// A link to this page would open nothing, so none is offered.
		expect(
			within(win).queryByRole("button", { name: "Copy Theme Link" }),
		).not.toBeInTheDocument();
	});

	it("asks before adding the theme, Cancel the default, and Cancel adds nothing", async () => {
		visit(await linkTo(oceanTheme()));
		mount(true);
		const alert = await findAlert("Add the theme “Ocean” from this link?");
		expect(alert).toHaveTextContent(
			"This link holds a theme for the Platinum appearance.",
		);
		expect(within(alert).getByAltText("Caution")).toBeInTheDocument();
		// Nothing is used before the user agrees.
		expect(appearance().customThemes ?? []).toHaveLength(0);
		const cancel = within(alert).getByRole("button", { name: "Cancel" });
		expect(cancel).toHaveAttribute("data-classicy-role", "default");
		press(alert, "Cancel");
		await noAlert();
		expect(appearance().customThemes ?? []).toHaveLength(0);
		expect(appearance().activeTheme.name).not.toBe("Ocean");
		expect(window.location.href).toBe(PAGE);
	});

	it("adds the theme as a custom theme on Add Theme and removes the link", async () => {
		visit(await linkTo(oceanTheme()));
		mount(true);
		press(await findAlert(/Ocean/), "Add Theme");
		await noAlert();
		expect(appearance().customThemes?.map((t) => t.id)).toEqual([
			"custom-ocean",
		]);
		expect(appearance().activeTheme.id).toBe("custom-ocean");
		expect(appearance().activeTheme.color).toEqual(getTheme("bondi").color);
		expect(window.location.href).toBe(PAGE);
	});

	it("round-trips a theme: Copy Theme Link, then open the link", async () => {
		const writeText = vi.fn(async (_: string) => {});
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
		visit(PAGE);
		mount(true);
		const win = await openAppearanceManager();
		act(() => {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		});
		await settle();
		fireEvent.click(
			within(win).getByRole("button", { name: "Copy Theme Link" }),
		);
		await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
		const copied = writeText.mock.calls[0][0];
		expect(copied.startsWith(`${PAGE}#${CLASSICY_THEME_LINK_KEY}=`)).toBe(true);
		expect(
			await within(win).findByText("The link to “Azul” is on the clipboard."),
		).toBeInTheDocument();

		// Another visitor: a fresh desktop opening the copied link.
		cleanup();
		vi.unstubAllGlobals();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		visit(copied);
		mount(true);
		press(await findAlert("Add the theme “Azul” from this link?"), "Add Theme");
		await noAlert();
		const imported = appearance().activeTheme;
		// A new custom theme, named apart from the built-in Azul, as any
		// import is (assignImportedClassicyThemeIdentity).
		expect(imported.name).toBe("Azul copy");
		expect(appearance().customThemes?.map((t) => t.id)).toEqual([imported.id]);
		expect(imported.color).toEqual(getTheme("azul").color);
		expect(imported.typography).toEqual(getTheme("azul").typography);
		expect(imported.desktop).toEqual(getTheme("azul").desktop);
	});

	it("says so when the browser will not take the link", async () => {
		const writeText = vi.fn(async (_: string) => {
			throw new DOMException("denied", "NotAllowedError");
		});
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
		visit(PAGE);
		mount(true);
		const win = await openAppearanceManager();
		await settle();
		fireEvent.click(
			within(win).getByRole("button", { name: "Copy Theme Link" }),
		);
		const alert = await findAlert("The theme link could not be copied.");
		expect(alert).toHaveTextContent(
			"Your browser did not let Classicy use the clipboard.",
		);
		expect(writeText).toHaveBeenCalledTimes(1);
	});

	it("shows the theme's name without control or format characters", async () => {
		const sneaky = oceanTheme();
		sneaky.name = "Oc\u202Eea\u200Bn";
		visit(await linkTo(sneaky));
		mount(true);
		expect(
			await findAlert("Add the theme “Ocean” from this link?"),
		).toBeInTheDocument();
	});

	it("asks again before using a remote desktop picture; Don't Use is the default and drops it", async () => {
		const remote = oceanTheme();
		remote.desktop.backgroundImage = "https://pictures.example/p.png";
		visit(await linkTo(remote));
		mount(true);
		press(await findAlert(/Ocean/), "Add Theme");
		const picture = await findAlert(
			"Use the desktop picture from pictures.example?",
		);
		expect(picture).toHaveTextContent("another website");
		// Not used, nor even held, until the user agrees.
		expect(appearance().customThemes ?? []).toHaveLength(0);
		expect(
			document.querySelector("#classicyDesktop")?.getAttribute("style"),
		).not.toContain("pictures.example");
		expect(
			within(picture).getByRole("button", { name: "Don’t Use" }),
		).toHaveAttribute("data-classicy-role", "default");
		press(picture, "Don’t Use");
		await noAlert();
		expect(appearance().activeTheme.name).toBe("Ocean");
		expect(appearance().activeTheme.desktop.backgroundImage).toBe("");
		expect(JSON.stringify(useAppManager.getState())).not.toContain(
			"pictures.example",
		);
		expect(window.location.href).toBe(PAGE);
	});

	it("uses the remote desktop picture on Use Picture", async () => {
		const remote = oceanTheme();
		remote.desktop.backgroundImage = "https://pictures.example/p.png";
		visit(await linkTo(remote));
		mount(true);
		press(await findAlert(/Ocean/), "Add Theme");
		press(await findAlert(/pictures\.example/), "Use Picture");
		await noAlert();
		expect(appearance().activeTheme.desktop.backgroundImage).toBe(
			"https://pictures.example/p.png",
		);
	});

	it("switches to another installed package's appearance, as Load Theme… does", async () => {
		const [system7] = getAllThemes().filter((t) => t.package === "system7");
		visit(await linkTo(structuredClone(system7)));
		mount(true);
		const alert = await findAlert(
			`Add the theme “${system7.name}” from this link?`,
		);
		expect(alert).toHaveTextContent(
			"switches the appearance to System 7 and makes it the current theme",
		);
		press(alert, "Add Theme");
		await noAlert();
		expect(appearance().packageId).toBe("system7");
		expect(appearance().activeTheme.package).toBe("system7");
		expect(appearance().activeTheme.color).toEqual(system7.color);
		expect(appearance().customThemes?.map((t) => t.package)).toEqual([
			"system7",
		]);
		// Named apart from the built-in it copies, the Finder's way, its own
		// number untouched.
		expect(appearance().activeTheme.name).toBe(`${system7.name} copy`);
	});

	it("refuses a theme for a package that is not installed", async () => {
		const file = JSON.parse(compactClassicyThemeFile(oceanTheme()));
		file.theme.package = "irix";
		visit(linkHolding(JSON.stringify(file)));
		mount(true);
		const alert = await findAlert("The theme in this link could not be added.");
		expect(alert).toHaveTextContent(
			'This theme needs the "irix" appearance package, which is not installed.',
		);
		expect(within(alert).getByAltText("Error")).toBeInTheDocument();
		press(alert, "OK");
		await noAlert();
		expect(appearance().customThemes ?? []).toHaveLength(0);
		expect(appearance().packageId).toBe("platinum");
		expect(window.location.href).toBe(PAGE);
	});

	it("refuses an oversized fragment", async () => {
		visit(
			`${PAGE}#${CLASSICY_THEME_LINK_KEY}=${"A".repeat(CLASSICY_THEME_LINK_MAX_LENGTH + 1)}`,
		);
		mount(true);
		const alert = await findAlert("The theme in this link could not be added.");
		expect(alert).toHaveTextContent("This theme link is too long to open.");
		press(alert, "OK");
		await noAlert();
		expect(appearance().customThemes ?? []).toHaveLength(0);
		expect(window.location.href).toBe(PAGE);
	});

	it("refuses a corrupt fragment", async () => {
		visit(`${PAGE}#${CLASSICY_THEME_LINK_KEY}=not-a-theme-at-all`);
		mount(true);
		const alert = await findAlert("The theme in this link could not be added.");
		expect(alert).toHaveTextContent(
			"This link is damaged: it does not hold a theme.",
		);
		press(alert, "OK");
		await noAlert();
		expect(appearance().customThemes ?? []).toHaveLength(0);
	});

	it("refuses a theme the schema rejects", async () => {
		const file = JSON.parse(compactClassicyThemeFile(oceanTheme()));
		file.theme.desktop.backgroundImage = 'https://x.example/a.png") , url("';
		visit(linkHolding(JSON.stringify(file)));
		mount(true);
		const alert = await findAlert("The theme in this link could not be added.");
		expect(alert).toHaveTextContent(
			"This theme has invalid settings: desktop.backgroundImage",
		);
	});

	it("opens a link that arrives later, on hashchange", async () => {
		mount(true);
		await settle();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		const url = await linkTo(oceanTheme());
		act(() => {
			window.location.hash = new URL(url).hash;
		});
		expect(await findAlert(/Ocean/)).toBeInTheDocument();
	});

	it("asks once on a page with more than one opener", async () => {
		const Second = () => <>{useClassicyThemeLinkImport(true)}</>;
		visit(await linkTo(oceanTheme()));
		render(
			<Classicy startupScreen={false} controlStrip={false} themeLinks>
				<Second />
			</Classicy>,
		);
		await findAlert(/Ocean/);
		await settle();
		expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
	});
});
