import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									focused: false,
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											collapsed: false,
											focused: false,
											dragging: false,
											moving: false,
											resizing: false,
											zoomed: false,
											closed: false,
											size: [350, 200] as [number, number],
											position: [110, 110] as [number, number],
											minimumSize: [0, 0] as [number, number],
											menuBar: [] as unknown[],
											default: false,
										},
									],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const closeCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowClose",
	);

function clickCloseBox(container: HTMLElement) {
	const box = container.querySelector(".classicyWindowCloseBox");
	if (!box) throw new Error("close box not found");
	fireEvent.click(box);
}

describe("ClassicyWindow onBeforeClose veto (#236)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("closes normally when no onBeforeClose is provided", () => {
		const onCloseFunc = vi.fn();
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Doc"
				onCloseFunc={onCloseFunc}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		clickCloseBox(container);
		expect(closeCalls()).toHaveLength(1);
		expect(onCloseFunc).toHaveBeenCalledWith("TestWindow");
	});

	it("proceeds when onBeforeClose synchronously returns true", () => {
		const onCloseFunc = vi.fn();
		const onBeforeClose = vi.fn(() => true);
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Doc"
				onBeforeClose={onBeforeClose}
				onCloseFunc={onCloseFunc}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		clickCloseBox(container);
		expect(onBeforeClose).toHaveBeenCalledWith("TestWindow");
		expect(closeCalls()).toHaveLength(1);
		expect(onCloseFunc).toHaveBeenCalledWith("TestWindow");
	});

	it("cancels when onBeforeClose synchronously returns false", () => {
		const onCloseFunc = vi.fn();
		const onBeforeClose = vi.fn(() => false);
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Doc"
				onBeforeClose={onBeforeClose}
				onCloseFunc={onCloseFunc}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		clickCloseBox(container);
		expect(onBeforeClose).toHaveBeenCalledWith("TestWindow");
		expect(closeCalls()).toHaveLength(0);
		expect(onCloseFunc).not.toHaveBeenCalled();
	});

	it("proceeds once a Promise-returning onBeforeClose resolves true", async () => {
		const onCloseFunc = vi.fn();
		let resolve!: (value: boolean) => void;
		const onBeforeClose = vi.fn(
			() =>
				new Promise<boolean>((r) => {
					resolve = r;
				}),
		);
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Doc"
				onBeforeClose={onBeforeClose}
				onCloseFunc={onCloseFunc}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		clickCloseBox(container);
		// Nothing happens yet — the veto hasn't resolved.
		expect(closeCalls()).toHaveLength(0);
		expect(onCloseFunc).not.toHaveBeenCalled();

		resolve(true);
		await Promise.resolve();
		await Promise.resolve();

		expect(closeCalls()).toHaveLength(1);
		expect(onCloseFunc).toHaveBeenCalledWith("TestWindow");
	});

	it("cancels once a Promise-returning onBeforeClose resolves false", async () => {
		const onCloseFunc = vi.fn();
		let resolve!: (value: boolean) => void;
		const onBeforeClose = vi.fn(
			() =>
				new Promise<boolean>((r) => {
					resolve = r;
				}),
		);
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Doc"
				onBeforeClose={onBeforeClose}
				onCloseFunc={onCloseFunc}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		clickCloseBox(container);

		resolve(false);
		await Promise.resolve();
		await Promise.resolve();

		expect(closeCalls()).toHaveLength(0);
		expect(onCloseFunc).not.toHaveBeenCalled();
	});
});
