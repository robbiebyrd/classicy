import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
// Register the built-ins so the Logo saver's registration is exercised too.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
import {
	getClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import {
	ClassicyScreenSaverLogo,
	ClassicyScreenSaverLogoOptions,
	LogoConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Logo/ClassicyScreenSaverLogo";
import {
	CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID,
	CLASSICY_SCREEN_SAVER_LOGO_IDS,
	getClassicyScreenSaverLogo,
	listClassicyScreenSaverLogos,
	registerClassicyScreenSaverLogo,
	resolveClassicyScreenSaverLogo,
	subscribeClassicyScreenSaverLogos,
	unregisterClassicyScreenSaverLogo,
	useClassicyScreenSaverLogos,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Logo/ClassicyScreenSaverLogoRegistry";

const markOf = (container: HTMLElement) =>
	container.querySelector<HTMLImageElement>(".classicySaverLogoMark");

const builtInIds = Object.values(CLASSICY_SCREEN_SAVER_LOGO_IDS) as string[];

afterEach(() => {
	for (const logo of listClassicyScreenSaverLogos()) {
		if (!builtInIds.includes(logo.id))
			unregisterClassicyScreenSaverLogo(logo.id);
	}
});

describe("screen saver logo registry", () => {
	it("ships the Berkeley Systems, Classicy and Startup Screen logos, in that order", () => {
		const ids = listClassicyScreenSaverLogos().map((logo) => logo.id);
		expect(ids.slice(0, 3)).toEqual([
			"berkeley-systems",
			"classicy",
			"startup-screen",
		]);
		expect(getClassicyScreenSaverLogo("classicy")?.src).toBe(
			ClassicyIcons.classicy.logo,
		);
		// The startup screen's default mark (ClassicyStartupScreen `logo` prop).
		expect(getClassicyScreenSaverLogo("startup-screen")?.src).toBe(
			ClassicyIcons.system.macosSvg,
		);
		expect(CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID).toBe("berkeley-systems");
	});

	it("lists third-party logos after the built-ins, in registration order", () => {
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme",
			src: "/a.png",
		});
		registerClassicyScreenSaverLogo({
			id: "zeta",
			name: "Zeta",
			src: "/z.png",
		});
		expect(listClassicyScreenSaverLogos().map((logo) => logo.id)).toEqual([
			...builtInIds,
			"acme",
			"zeta",
		]);
	});

	it("re-registering an id replaces the logo in place", () => {
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme",
			src: "/a.png",
		});
		registerClassicyScreenSaverLogo({
			id: "zeta",
			name: "Zeta",
			src: "/z.png",
		});
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme Two",
			src: "/a2.png",
		});
		const logos = listClassicyScreenSaverLogos();
		expect(logos.map((logo) => logo.id)).toEqual([
			...builtInIds,
			"acme",
			"zeta",
		]);
		expect(getClassicyScreenSaverLogo("acme")).toEqual({
			id: "acme",
			name: "Acme Two",
			src: "/a2.png",
		});
	});

	it("notifies subscribers on register and unregister", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyScreenSaverLogos(listener);
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme",
			src: "/a.png",
		});
		expect(listener).toHaveBeenCalledTimes(1);
		expect(unregisterClassicyScreenSaverLogo("acme")).toBe(true);
		expect(listener).toHaveBeenCalledTimes(2);
		expect(unregisterClassicyScreenSaverLogo("acme")).toBe(false);
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme",
			src: "/a.png",
		});
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("resolves unknown or missing ids to the default logo", () => {
		expect(resolveClassicyScreenSaverLogo("no-such-logo")?.id).toBe(
			"berkeley-systems",
		);
		expect(resolveClassicyScreenSaverLogo(undefined)?.id).toBe(
			"berkeley-systems",
		);
		expect(resolveClassicyScreenSaverLogo(42)?.id).toBe("berkeley-systems");
		expect(resolveClassicyScreenSaverLogo("classicy")?.id).toBe("classicy");
	});

	it("useClassicyScreenSaverLogos re-renders on registration", () => {
		const Names = () => (
			<ul>
				{useClassicyScreenSaverLogos().map((logo) => (
					<li key={logo.id}>{logo.name}</li>
				))}
			</ul>
		);
		render(<Names />);
		expect(screen.queryByText("Acme")).toBeNull();
		act(() => {
			registerClassicyScreenSaverLogo({
				id: "acme",
				name: "Acme",
				src: "/a.png",
			});
		});
		expect(screen.getByText("Acme")).toBeInTheDocument();
	});
});

describe("Logo saver registration", () => {
	it("registers with the logo schema and the pop-up options component", () => {
		const saver = getClassicyScreenSaver("logo");
		expect(saver?.configSchema).toBe(LogoConfigSchema);
		expect(saver?.configComponent).toBe(ClassicyScreenSaverLogoOptions);
		if (!saver) return;
		expect(resolveScreenSaverConfig(saver, undefined)).toEqual({
			logo: "berkeley-systems",
		});
		expect(resolveScreenSaverConfig(saver, { logo: "classicy" })).toEqual({
			logo: "classicy",
		});
	});
});

describe("ClassicyScreenSaverLogo", () => {
	it("draws the Berkeley Systems mark by default at its 145 × 54 px size", () => {
		const { container } = render(<ClassicyScreenSaverLogo config={{}} />);
		const mark = markOf(container);
		expect(mark?.getAttribute("src")).toBe(
			getClassicyScreenSaverLogo("berkeley-systems")?.src,
		);
		expect(mark?.getAttribute("width")).toBe("145");
		expect(mark?.getAttribute("height")).toBe("54");
		expect(mark?.style.getPropertyValue("--classicy-saver-logo-width")).toBe(
			"145px",
		);
		expect(mark?.style.getPropertyValue("--classicy-saver-logo-height")).toBe(
			"54px",
		);
	});

	it("draws the configured logo", () => {
		const { container } = render(
			<ClassicyScreenSaverLogo config={{ logo: "classicy" }} />,
		);
		expect(markOf(container)?.getAttribute("src")).toBe(
			ClassicyIcons.classicy.logo,
		);
	});

	it("falls back to the default when the configured logo is not registered", () => {
		const { container } = render(
			<ClassicyScreenSaverLogo config={{ logo: "gone" }} />,
		);
		expect(markOf(container)?.getAttribute("src")).toBe(
			getClassicyScreenSaverLogo("berkeley-systems")?.src,
		);
	});

	it("measures a logo without declared dimensions once it loads", () => {
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme",
			src: "/a.png",
		});
		const { container } = render(
			<ClassicyScreenSaverLogo config={{ logo: "acme" }} />,
		);
		const mark = markOf(container);
		expect(mark).not.toBeNull();
		if (!mark) return;
		expect(mark.hasAttribute("width")).toBe(false);
		expect(mark.style.getPropertyValue("--classicy-saver-logo-width")).toBe(
			"0px",
		);
		vi.spyOn(mark, "getBoundingClientRect").mockReturnValue({
			width: 200,
			height: 80,
		} as DOMRect);
		act(() => {
			mark.dispatchEvent(new Event("load"));
		});
		expect(mark.style.getPropertyValue("--classicy-saver-logo-width")).toBe(
			"200px",
		);
		expect(mark.style.getPropertyValue("--classicy-saver-logo-height")).toBe(
			"80px",
		);
	});
});

describe("ClassicyScreenSaverLogoOptions", () => {
	it("offers every registered logo and reports the chosen id", async () => {
		registerClassicyScreenSaverLogo({
			id: "acme",
			name: "Acme Corp",
			src: "/a.png",
		});
		const onChange = vi.fn();
		const user = userEvent.setup();
		render(
			<ClassicyScreenSaverLogoOptions
				config={{ logo: "berkeley-systems" }}
				onChange={onChange}
			/>,
		);
		const button = screen.getByRole("combobox", { name: "Logo" });
		expect(button).toHaveTextContent("Berkeley Systems");
		await user.click(button);
		const names = screen
			.getAllByRole("option")
			.map((option) => option.textContent?.replace("✓", "").trim());
		expect(names).toEqual([
			"Berkeley Systems",
			"Classicy",
			"Startup Screen",
			"Acme Corp",
		]);
		await user.click(screen.getByRole("option", { name: "Acme Corp" }));
		expect(onChange).toHaveBeenCalledWith({ logo: "acme" });
	});

	it("shows the default as current when the saved logo is unknown", () => {
		render(
			<ClassicyScreenSaverLogoOptions
				config={{ logo: "gone" }}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("combobox", { name: "Logo" })).toHaveTextContent(
			"Berkeley Systems",
		);
	});
});
