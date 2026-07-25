import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { AppleGuide } from "@/SystemFolder/Extensions/AppleGuide/AppleGuide";

const { appData } = vi.hoisted(() => ({
	appData: { value: {} as Record<string, unknown> },
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuide.scss", () => ({}));

vi.mock("@/SystemFolder/SystemResources/App/ClassicyApp", () => ({
	ClassicyApp: ({
		id,
		name,
		extension,
		children,
	}: {
		id: string;
		name: string;
		extension?: boolean;
		children?: ReactNode;
	}) => (
		<div data-testid="app" data-id={id} data-name={name} data-ext={!!extension}>
			{children}
		</div>
	),
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow", () => ({
	AppleGuideWindow: ({ topicId }: { topicId: string }) => (
		<div data-testid="topic-window">{topicId}</div>
	),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
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

beforeEach(() => {
	appData.value = {};
});

describe("AppleGuide", () => {
	it("registers as a headless extension named Apple Guide", () => {
		render(<AppleGuide />);
		const app = screen.getByTestId("app");
		expect(app).toHaveAttribute("data-id", "AppleGuide.app");
		expect(app).toHaveAttribute("data-name", "Apple Guide");
		expect(app).toHaveAttribute("data-ext", "true");
	});

	it("renders no topic windows when none are open", () => {
		render(<AppleGuide />);
		expect(screen.queryByTestId("topic-window")).not.toBeInTheDocument();
	});

	it("renders one window per open topic", () => {
		appData.value = { openTopics: ["about-balloon-help", "other"] };
		render(<AppleGuide />);
		expect(screen.getAllByTestId("topic-window")).toHaveLength(2);
		expect(screen.getByText("about-balloon-help")).toBeInTheDocument();
	});
});
