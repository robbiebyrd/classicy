import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicyMeter,
	meterZone,
} from "@/SystemFolder/SystemResources/Meter/ClassicyMeter";

vi.mock("@/SystemFolder/SystemResources/Meter/ClassicyMeter.scss", () => ({}));

describe("meterZone", () => {
	it("is optimal with no thresholds at all", () => {
		expect(meterZone(50)).toBe("optimal");
	});

	it("battery-style gauge (optimum high): low value is bad", () => {
		const bounds = { low: 20, high: 80, optimum: 90 };
		expect(meterZone(90, bounds)).toBe("optimal");
		expect(meterZone(50, bounds)).toBe("suboptimal");
		expect(meterZone(10, bounds)).toBe("bad");
	});

	it("disk-usage-style gauge (optimum low): high value is bad", () => {
		const bounds = { low: 60, high: 90, optimum: 10 };
		expect(meterZone(30, bounds)).toBe("optimal");
		expect(meterZone(75, bounds)).toBe("suboptimal");
		expect(meterZone(95, bounds)).toBe("bad");
	});

	it("mid-optimum gauge never reports bad", () => {
		const bounds = { low: 30, high: 70, optimum: 50 };
		expect(meterZone(50, bounds)).toBe("optimal");
		expect(meterZone(10, bounds)).toBe("suboptimal");
		expect(meterZone(90, bounds)).toBe("suboptimal");
	});
});

describe("ClassicyMeter", () => {
	it("renders role=meter with value/min/max ARIA attributes", () => {
		const { container } = render(<ClassicyMeter value={30} min={0} max={60} />);
		const meter = container.querySelector('[role="meter"]');
		expect(meter).not.toBeNull();
		expect(meter).toHaveAttribute("aria-valuenow", "30");
		expect(meter).toHaveAttribute("aria-valuemin", "0");
		expect(meter).toHaveAttribute("aria-valuemax", "60");
	});

	it("sizes the fill to the value fraction and clamps overflow", () => {
		const { container } = render(<ClassicyMeter value={25} max={50} />);
		expect(
			container.querySelector<HTMLElement>(".classicyMeterFill")?.style.width,
		).toBe("50%");

		const over = render(<ClassicyMeter value={200} max={100} />);
		expect(
			over.container.querySelector<HTMLElement>(".classicyMeterFill")?.style
				.width,
		).toBe("100%");
	});

	it("applies the zone class from the thresholds", () => {
		const { container } = render(
			<ClassicyMeter value={5} low={20} high={80} optimum={90} />,
		);
		expect(container.querySelector('[role="meter"]')).toHaveClass(
			"classicyMeterBad",
		);
	});

	it("renders discrete segments with the filled count lit", () => {
		const { container } = render(
			<ClassicyMeter value={50} max={100} segments={10} />,
		);
		expect(container.querySelectorAll(".classicyMeterSegment")).toHaveLength(
			10,
		);
		expect(container.querySelectorAll(".classicyMeterSegmentOn")).toHaveLength(
			5,
		);
	});

	it("prints the value when showValue is set", () => {
		const { container } = render(<ClassicyMeter value={42} showValue />);
		expect(container.querySelector(".classicyMeterValue")).toHaveTextContent(
			"42",
		);
	});

	it("renders a label above the gauge", () => {
		const { container } = render(<ClassicyMeter value={10} label="Battery" />);
		expect(container.querySelector("label")).toHaveTextContent("Battery");
	});
});
