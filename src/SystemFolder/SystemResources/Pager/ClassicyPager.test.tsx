import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyPager } from "@/SystemFolder/SystemResources/Pager/ClassicyPager";

describe("ClassicyPager", () => {
	it("shows the 1-based page number", () => {
		const { container } = render(
			<ClassicyPager page={0} pageCount={1} onPageChange={vi.fn()} />,
		);
		expect(container.querySelector(".classicyPagerPage")?.textContent).toBe(
			"1",
		);
	});

	it("adds an extra class to the page cell when asked", () => {
		const { container } = render(
			<ClassicyPager
				page={0}
				pageCount={1}
				onPageChange={vi.fn()}
				pageClassName="classicyAssistantPageIndicator"
			/>,
		);
		expect(
			container.querySelector(".classicyAssistantPageIndicator"),
		).toHaveClass("classicyPagerPage");
	});

	it("disables both arrows for a single-page topic", () => {
		render(<ClassicyPager page={0} pageCount={1} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		expect(screen.getByLabelText("Next page")).toBeDisabled();
	});

	it("disables only the back arrow on the first of several pages", () => {
		render(<ClassicyPager page={0} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		expect(screen.getByLabelText("Next page")).toBeEnabled();
	});

	it("disables only the forward arrow on the last page", () => {
		render(<ClassicyPager page={2} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeEnabled();
		expect(screen.getByLabelText("Next page")).toBeDisabled();
	});

	it("enables both arrows in the middle", () => {
		render(<ClassicyPager page={1} pageCount={3} onPageChange={vi.fn()} />);
		expect(screen.getByLabelText("Previous page")).toBeEnabled();
		expect(screen.getByLabelText("Next page")).toBeEnabled();
	});

	it("reports the next page index when the forward arrow is clicked", async () => {
		const onPageChange = vi.fn();
		render(
			<ClassicyPager page={1} pageCount={3} onPageChange={onPageChange} />,
		);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(onPageChange).toHaveBeenCalledWith(2);
	});

	it("reports the previous page index when the back arrow is clicked", async () => {
		const onPageChange = vi.fn();
		render(
			<ClassicyPager page={1} pageCount={3} onPageChange={onPageChange} />,
		);
		await userEvent.click(screen.getByLabelText("Previous page"));
		expect(onPageChange).toHaveBeenCalledWith(0);
	});

	it("never changes page on its own", async () => {
		const { container } = render(
			<ClassicyPager page={1} pageCount={3} onPageChange={vi.fn()} />,
		);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(container.querySelector(".classicyPagerPage")?.textContent).toBe(
			"2",
		);
	});
});
