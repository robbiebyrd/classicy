import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyFileDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow is used; only its external hooks are mocked so the
// modal renders (and portals to document.body) without a provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Applications: { apps: {} } },
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyFileDialog modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// ClassicyFileDialog is always modal={true} — ClassicyWindow's cleanup
	// effect must dispatch ClassicyWindowDestroy for it on unmount (#222/#223),
	// so reopening Open/Save takes focus rather than silently reusing a stale
	// store record.
	it("dispatches ClassicyWindowDestroy for the dialog window on unmount", () => {
		const { unmount } = render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[]}
				onOpenFunc={() => {}}
			/>,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "Finder.app" },
			window: { id: "open-dialog" },
		});
	});
});

// Standard File's list keeps a fits-state vertical bar in System 7
// (`*-dialog-standardfile-open.png`, four items): the well follows the
// package's `layout.scrollBar.fitsBars`, as a list box does. jsdom lays
// nothing out, so the list always fits here.
describe("ClassicyFileDialog list bar while the items fit", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const wellBars = () =>
		document.querySelectorAll<HTMLElement>(
			'.classicyFileOpenDialogWell [data-classicy-part="scrollbar"]',
		);
	const open = () =>
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[]}
				onOpenFunc={() => {}}
			/>,
		);

	it("draws none by default (Mac OS 8)", () => {
		open();
		expect(wellBars()).toHaveLength(0);
	});

	it("keeps its vertical bar, fits, under a package that keeps the bars", () => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage({
			id: "test-fits-bars",
			name: "Fits Bars",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-fits-bars-default",
				package: "test-fits-bars",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				scrollBar: { fitsBars: "shown" },
			},
		});
		open();
		const bars = wellBars();
		expect(bars).toHaveLength(1);
		expect(bars[0].classList.contains("classicyScrollBarVertical")).toBe(true);
		expect(bars[0].classList.contains("fits")).toBe(true);
	});
});
