import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

vi.mock("@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics", () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext", () => ({
  useSoundDispatch: () => vi.fn(),
}));

vi.mock("@img/ui/tab.svg?base64", () => ({ default: "" }));
vi.mock("@/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss", () => ({}));

const tabs = [
  { title: "First Tab", children: <p>First content</p> },
  { title: "Second Tab", children: <p>Second content</p> },
  { title: "Third Tab", children: <p>Third content</p> },
];

describe("ClassicyTabs", () => {
  it("renders tab buttons with titles", () => {
    render(<ClassicyTabs tabs={tabs} />);
    expect(screen.getByText("First Tab")).toBeInTheDocument();
    expect(screen.getByText("Second Tab")).toBeInTheDocument();
    expect(screen.getByText("Third Tab")).toBeInTheDocument();
  });

  it("first tab content is visible by default", () => {
    const { container } = render(<ClassicyTabs tabs={tabs} />);
    const contentDivs = container.querySelectorAll(
      ".classicyTabActiveContent, .classicyTabHiddenContent",
    );
    expect(contentDivs[0]).toHaveClass("classicyTabActiveContent");
  });

  it("non-first tabs are hidden by default", () => {
    const { container } = render(<ClassicyTabs tabs={tabs} />);
    const contentDivs = container.querySelectorAll(
      ".classicyTabActiveContent, .classicyTabHiddenContent",
    );
    expect(contentDivs[1]).toHaveClass("classicyTabHiddenContent");
    expect(contentDivs[2]).toHaveClass("classicyTabHiddenContent");
  });

  it("first tab button has active class by default", () => {
    render(<ClassicyTabs tabs={tabs} />);
    const firstButton = screen.getByRole("button", { name: "First Tab" });
    expect(firstButton).toHaveClass("classicyTabButtonActive");
  });

  it("clicking second tab shows its content and hides first", async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassicyTabs tabs={tabs} />);
    const secondButton = screen.getByRole("button", { name: "Second Tab" });
    await user.click(secondButton);
    const contentDivs = container.querySelectorAll(
      ".classicyTabActiveContent, .classicyTabHiddenContent",
    );
    expect(contentDivs[0]).toHaveClass("classicyTabHiddenContent");
    expect(contentDivs[1]).toHaveClass("classicyTabActiveContent");
  });
});
