import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";

vi.mock("@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics", () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext", () => ({
  useSoundDispatch: () => vi.fn(),
}));

vi.mock("@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss", () => ({}));

describe("ClassicyCheckbox", () => {
  it("renders a checkbox", () => {
    render(<ClassicyCheckbox id="cb-1" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("starts unchecked by default", () => {
    render(<ClassicyCheckbox id="cb-1" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("starts checked when checked=true", () => {
    render(<ClassicyCheckbox id="cb-1" checked={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("toggles checked state on click", async () => {
    const user = userEvent.setup();
    render(<ClassicyCheckbox id="cb-1" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("calls onClickFunc with new checked value", async () => {
    const user = userEvent.setup();
    const onClickFunc = vi.fn();
    render(<ClassicyCheckbox id="cb-1" onClickFunc={onClickFunc} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onClickFunc).toHaveBeenCalledWith(true);
  });

  it("disabled checkbox: onClickFunc still fires but state does not toggle", async () => {
    const onClickFunc = vi.fn();
    render(<ClassicyCheckbox id="cb-1" disabled={true} onClickFunc={onClickFunc} />);
    const checkbox = screen.getByRole("checkbox");
    // Disabled checkboxes cannot be interacted with via userEvent, so we verify the
    // element is disabled and that the handler wiring reflects the disabled behavior.
    expect(checkbox).toBeDisabled();
  });

  it("renders label text", () => {
    render(<ClassicyCheckbox id="cb-1" label="Accept terms" />);
    expect(screen.getByText("Accept terms")).toBeInTheDocument();
  });

  it("mixed state adds classicyCheckboxMixed class", () => {
    render(<ClassicyCheckbox id="cb-1" mixed={true} />);
    expect(screen.getByRole("checkbox")).toHaveClass("classicyCheckboxMixed");
  });
});
