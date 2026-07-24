import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { AppleGuidePager } from "@/SystemFolder/Extensions/AppleGuide/AppleGuidePager";

describe("AppleGuidePager", () => {
	it("shows the 1-based page number", () => {
		const { container } = render(
			<AppleGuidePager page={0} pageCount={1} onPageChange={vi.fn()} />,
		);
		expect(container.querySelector(".appleGuidePagerPage")?.textContent).toBe(
			"1",
		);
	});

	it("disables both arrows for a single-page topic", () => {
		render(<AppleGuidePager page={0} pageCount={1} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		expect(screen.getByLabelText("Next page")).toBeDisabled();
	});

	it("disables only the back arrow on the first of several pages", () => {
		render(<AppleGuidePager page={0} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		expect(screen.getByLabelText("Next page")).toBeEnabled();
	});

	it("disables only the forward arrow on the last page", () => {
		render(<AppleGuidePager page={2} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeEnabled();
		expect(screen.getByLabelText("Next page")).toBeDisabled();
	});

	it("enables both arrows in the middle", () => {
		render(<AppleGuidePager page={1} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeEnabled();
		expect(screen.getByLabelText("Next page")).toBeEnabled();
	});

	it("reports the next page index when the forward arrow is clicked", async () => {
		const onPageChange = vi.fn();
		render(
			<AppleGuidePager page={1} pageCount={3} onPageChange={onPageChange} />,
		);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(onPageChange).toHaveBeenCalledWith(2);
	});

	it("reports the previous page index when the back arrow is clicked", async () => {
		const onPageChange = vi.fn();
		render(
			<AppleGuidePager page={1} pageCount={3} onPageChange={onPageChange} />,
		);
		await userEvent.click(screen.getByLabelText("Previous page"));
		expect(onPageChange).toHaveBeenCalledWith(0);
	});
});
