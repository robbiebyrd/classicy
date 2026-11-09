import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, userEvent } from "@/__tests__/test-utils";
import {
	ClassicyIcons,
	registerClassicyIcons,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
// Register Platinum's savers so the Logo saver's registration is exercised too.
import "../platinumScreenSavers";
import {
	getClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import {
	ClassicyScreenSaverLogo,
	ClassicyScreenSaverLogoOptions,
	LogoConfigSchema,
} from "./ClassicyScreenSaverLogo";
import {
	CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID,
	CLASSICY_SCREEN_SAVER_LOGO_IDS,
	type ClassicyScreenSaverLogoDefinition,
	classicyScreenSaverLogoSrc,
	getClassicyScreenSaverLogo,
	listClassicyScreenSaverLogos,
	registerClassicyScreenSaverLogo,
	resolveClassicyScreenSaverLogo,
	subscribeClassicyScreenSaverLogos,
	unregisterClassicyScreenSaverLogo,
	useClassicyScreenSaverLogos,
} from "./ClassicyScreenSaverLogoRegistry";

const markOf = (container: HTMLElement) =>
	container.querySelector<HTMLImageElement>(".classicySaverLogoMark");

const builtInIds = Object.values(CLASSICY_SCREEN_SAVER_LOGO_IDS) as string[];

/** A registered logo's image, as the saver draws it now. */
const drawnSrc = (id: string) => {
	const logo = getClassicyScreenSaverLogo(id);
	return logo ? classicyScreenSaverLogoSrc(logo) : undefined;
};

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
		expect(drawnSrc("classicy")).toBe(ClassicyIcons.classicy.logo);
		// The startup screen's default mark (ClassicyStartupScreen `logo` prop).
		expect(drawnSrc("startup-screen")).toBe(ClassicyIcons.system.macosSvg);
		expect(CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID).toBe("berkeley-systems");
	});

	it("the three built-in logos resolve, the classicy and startup-screen logos at draw time", () => {
		for (const id of builtInIds)
			expect(resolveClassicyScreenSaverLogo(id)?.id).toBe(id);
		// Platinum's own mark is a file; the other two read the asset registry
		// whenever the saver draws, never a module-scope capture.
		expect(typeof getClassicyScreenSaverLogo("berkeley-systems")?.src).toBe(
			"string",
		);
		expect(typeof getClassicyScreenSaverLogo("classicy")?.src).toBe("function");
		expect(typeof getClassicyScreenSaverLogo("startup-screen")?.src).toBe(
			"function",
		);
		const original = {
			classicy: { logo: ClassicyIcons.classicy.logo },
			system: { macosSvg: ClassicyIcons.system.macosSvg },
		};
		registerClassicyIcons({
			classicy: { logo: "/later-classicy.svg" },
			system: { macosSvg: "/later-macos.svg" },
		});
		try {
			const classicy = render(
				<ClassicyScreenSaverLogo config={{ logo: "classicy" }} />,
			);
			expect(markOf(classicy.container)?.getAttribute("src")).toBe(
				"/later-classicy.svg",
			);
			const startup = render(
				<ClassicyScreenSaverLogo config={{ logo: "startup-screen" }} />,
			);
			expect(markOf(startup.container)?.getAttribute("src")).toBe(
				"/later-macos.svg",
			);
		} finally {
			registerClassicyIcons(original);
		}
		expect(drawnSrc("classicy")).toBe(ClassicyIcons.classicy.logo);
	});

	it("draws a logo whose src is a function with what it returns", () => {
		const logo: ClassicyScreenSaverLogoDefinition = {
			id: "acme",
			name: "Acme",
			src: () => "/acme-now.png",
			width: 10,
			height: 10,
		};
		registerClassicyScreenSaverLogo(logo);
		const { container } = render(
			<ClassicyScreenSaverLogo config={{ logo: "acme" }} />,
		);
		expect(markOf(container)?.getAttribute("src")).toBe("/acme-now.png");
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
		expect(markOf(container)?.getAttribute("src")).toBe(drawnSrc("classicy"));
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
