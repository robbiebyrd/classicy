import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";

vi.mock("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils", () => ({
  useAppManagerDispatch: () => vi.fn(),
}));
vi.mock("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext", () => ({
  useSoundDispatch: () => vi.fn(),
}));
vi.mock("@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics", () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const basicItems = [
  { id: "item-1", title: "File" },
  { id: "item-2", title: "Edit" },
];

describe("ClassicyMenu", () => {
  it("renders menu items with their titles", () => {
    render(<ClassicyMenu name="test-menu" menuItems={basicItems} />);
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders nothing when menuItems is an empty array", () => {
    const { container } = render(<ClassicyMenu name="test-menu" menuItems={[]} />);
    // Should render an empty fragment — no ul, no li
    expect(container.querySelector("ul")).not.toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
  });

  it("renders a spacer as <hr> for items with id='spacer'", () => {
    const items = [
      { id: "item-1", title: "New" },
      { id: "spacer" },
      { id: "item-2", title: "Open" },
    ];
    render(<ClassicyMenu name="test-menu" menuItems={items} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders keyboard shortcut text when keyboardShortcut is provided", () => {
    const items = [{ id: "item-1", title: "Save", keyboardShortcut: "&#8984;S" }];
    render(<ClassicyMenu name="test-menu" menuItems={items} />);
    // he.decode converts &#8984; to the Command symbol
    expect(screen.getByText("\u2318S")).toBeInTheDocument();
  });

  it("renders a nested submenu for items with menuChildren", () => {
    const items = [
      {
        id: "item-1",
        title: "View",
        menuChildren: [
          { id: "child-1", title: "Zoom In" },
          { id: "child-2", title: "Zoom Out" },
        ],
      },
    ];
    render(<ClassicyMenu name="test-menu" menuItems={items} />);
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Zoom In")).toBeInTheDocument();
    expect(screen.getByText("Zoom Out")).toBeInTheDocument();
  });
});
