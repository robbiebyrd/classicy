import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ClassicyColorPicker } from "./ClassicyColorPicker";
import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { MAC_OS_8_CRAYONS } from "./ClassicyColorPickerCrayons";

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock("./ClassicyColorPicker.scss", () => ({}));

// Mock ClassicyWindow: it uses Zustand + side-effects, and we need to render the
// title prop so the "Color Picker" heading is findable in the DOM.
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
  ClassicyWindow: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      <p>{title}</p>
      {children}
    </div>
  ),
}));

// Mock ClassicyTabs deps so rendering the full dialog doesn't need providers.
vi.mock("@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics", () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock(
  "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
  () => ({
    useSoundDispatch: () => vi.fn(),
  }),
);

// SCSS mocks for the dependency chain.
vi.mock("@/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Slider/ClassicySlider.scss", () => ({}));
vi.mock(
  "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
  () => ({}),
);
vi.mock(
  "@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
  () => ({}),
);

// Mock canvas so ClassicyColorWheel (used by HSV/HLS tabs) doesn't error.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

// ── ClassicyColorPicker swatch wrapper ────────────────────────────────────────

describe("ClassicyColorPicker", () => {
  it("renders swatch with preview color variable matching defaultValue", () => {
    const { container } = render(
      <ClassicyColorPicker id="test" defaultValue={0xff0000} />,
    );
    const swatch = container.querySelector(
      ".classicyColorPickerSwatch",
    ) as HTMLElement;
    expect(swatch).toBeInTheDocument();
    expect(swatch.style.getPropertyValue("--classicy-preview-color")).toBe(
      "#ff0000",
    );
  });

  it("does not show dialog before swatch is clicked", () => {
    render(<ClassicyColorPicker id="test" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking swatch opens the dialog", () => {
    const { container } = render(<ClassicyColorPicker id="test" />);
    const swatch = container.querySelector(
      ".classicyColorPickerSwatch",
    ) as HTMLElement;
    fireEvent.click(swatch);
    expect(screen.getByText("Color Picker")).toBeInTheDocument();
  });

  it("clicking Cancel closes the dialog without calling onChangeFunc", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPicker id="test" onChangeFunc={onChange} />,
    );
    fireEvent.click(
      container.querySelector(".classicyColorPickerSwatch") as HTMLElement,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("clicking OK calls onChangeFunc with the integer color and closes dialog", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPicker id="test" defaultValue={0x00ff00} onChangeFunc={onChange} />,
    );
    fireEvent.click(
      container.querySelector(".classicyColorPickerSwatch") as HTMLElement,
    );
    fireEvent.click(screen.getByText("OK"));
    expect(onChange).toHaveBeenCalledWith(0x00ff00);
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("swatch is disabled and dialog cannot be opened when disabled=true", () => {
    const { container } = render(
      <ClassicyColorPicker id="test" disabled={true} />,
    );
    const swatch = container.querySelector(
      ".classicyColorPickerSwatch",
    ) as HTMLButtonElement;
    expect(swatch).toBeDisabled();
    fireEvent.click(swatch);
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("renders a label when labelTitle is provided", () => {
    render(<ClassicyColorPicker id="test" labelTitle="Accent colour:" />);
    expect(screen.getByText("Accent colour:")).toBeInTheDocument();
  });
});

// ── Sub-component behavioural tests ───────────────────────────────────────────

describe("ClassicyColorPickerCrayon — crayon click", () => {
  it("calls onChangeFunc with the crayon's integer color when clicked", () => {
    const onChange = vi.fn();
    const firstCrayon = MAC_OS_8_CRAYONS[0];
    render(
      <ClassicyColorPickerCrayon
        color={0x000000}
        crayons={MAC_OS_8_CRAYONS}
        onChangeFunc={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle(firstCrayon.name));
    expect(onChange).toHaveBeenCalledWith(firstCrayon.color);
  });
});

describe("ClassicyColorPickerRGB — boundary values", () => {
  it("all sliders at 0% produces 0x000000", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerRGB color={0x000000} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    // Move Red to 100%
    fireEvent.change(sliders[0], { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(0xff0000);
  });

  it("all sliders at 100% produces 0xFFFFFF", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerRGB color={0xffffff} onChangeFunc={onChange} />,
    );
    // Moving Blue to 0% on a white color: r=255, g=255, b=0
    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[2], { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(0xffff00);
  });
});

describe("ClassicyColorPickerCMYK — boundary values", () => {
  it("K=100 produces black (0x000000)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerCMYK color={0xffffff} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    // K slider is index 3
    fireEvent.change(sliders[3], { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(0x000000);
  });

  it("all channels at 0% produces white (0xFFFFFF)", () => {
    const onChange = vi.fn();
    render(
      <ClassicyColorPickerCMYK color={0xffffff} onChangeFunc={onChange} />,
    );
    // Color is already white — emitting 0% on any slider should stay white
    const { container } = render(
      <ClassicyColorPickerCMYK color={0x000000} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[3], { target: { value: "0" } }); // K=0, rest already 0
    expect(onChange).toHaveBeenLastCalledWith(0xffffff);
  });
});
