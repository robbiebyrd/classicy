import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { registerAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";

const { dispatch, appData } = vi.hoisted(() => ({
	dispatch: vi.fn(),
	appData: { value: {} as Record<string, unknown> },
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuide.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Pager/ClassicyPager.scss", () => ({}));

// Reduce ClassicyWindow to a wrapper: the real chrome is tested elsewhere.
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		children,
		onCloseFunc,
	}: {
		children?: ReactNode;
		onCloseFunc?: (id: string) => void;
	}) => (
		<div>
			{children}
			<button type="button" onClick={() => onCloseFunc?.("w")}>
				close
			</button>
		</div>
	),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: (selector: (s: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: {
							apps: { "AppleGuide.app": { data: appData.value } },
						},
					},
				},
			}),
	}),
);

registerAppleGuideTopic({
	id: "one-page",
	title: "About Help",
	pages: [<p key="0">The Help menu includes:</p>],
});
registerAppleGuideTopic({
	id: "three-page",
	title: "Three Pager",
	pages: [
		<p key="0">First page body</p>,
		<p key="1">Second page body</p>,
		<p key="2">Third page body</p>,
	],
});

beforeEach(() => {
	dispatch.mockClear();
	appData.value = {};
});

describe("AppleGuideWindow", () => {
	it("renders the topic title in the header band", () => {
		const { container } = render(<AppleGuideWindow topicId="one-page" />);
		expect(
			container.querySelector(".classicyAssistantHeader"),
		).toHaveTextContent("About Help");
	});

	it("keeps the topic title on every page", () => {
		appData.value = { pages: { "three-page": 2 } };
		const { container } = render(<AppleGuideWindow topicId="three-page" />);
		expect(
			container.querySelector(".classicyAssistantHeader"),
		).toHaveTextContent("Three Pager");
	});

	it("renders no footer buttons", () => {
		const { container } = render(<AppleGuideWindow topicId="one-page" />);
		expect(
			container.querySelector(".classicyAssistantFooterButtons")?.children,
		).toHaveLength(0);
	});

	it("renders the current page body", () => {
		render(<AppleGuideWindow topicId="one-page" />);
		expect(screen.getByText("The Help menu includes:")).toBeInTheDocument();
	});

	it("shows the end marker on the last page", () => {
		render(<AppleGuideWindow topicId="one-page" />);
		expect(screen.getByText("- End -")).toBeInTheDocument();
	});

	it("hides the end marker on a non-final page", () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		expect(screen.queryByText("- End -")).not.toBeInTheDocument();
	});

	it("renders the page indicated by store state", () => {
		appData.value = { pages: { "three-page": 1 } };
		render(<AppleGuideWindow topicId="three-page" />);
		expect(screen.getByText("Second page body")).toBeInTheDocument();
	});

	it("dispatches SetPage when the forward arrow is clicked", async () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideSetPage",
			app: { id: "AppleGuide.app" },
			topicId: "three-page",
			page: 1,
		});
	});

	it("does not move pages on its own — the store drives the index", async () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByText("First page body")).toBeInTheDocument();
		expect(screen.queryByText("Second page body")).not.toBeInTheDocument();
	});

	it("dispatches CloseTopic when the window is closed", async () => {
		render(<AppleGuideWindow topicId="one-page" />);
		await userEvent.click(screen.getByText("close"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideCloseTopic",
			app: { id: "AppleGuide.app" },
			topicId: "one-page",
		});
	});

	it("renders nothing for an unregistered topic", () => {
		const { container } = render(<AppleGuideWindow topicId="missing" />);
		expect(container).toBeEmptyDOMElement();
	});
});
