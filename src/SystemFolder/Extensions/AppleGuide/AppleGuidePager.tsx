import type { FC as FunctionalComponent } from "react";

type AppleGuidePagerProps = {
	/** Zero-based current page. */
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
};

/**
 * The Platinum page control from the bottom-right of an Apple Guide window:
 * a back arrow, a recessed page-number cell, and a forward arrow. Arrow
 * enablement derives from position, so a one-page topic renders both arrows
 * disabled without a special case.
 */
export const AppleGuidePager: FunctionalComponent<AppleGuidePagerProps> = ({
	page,
	pageCount,
	onPageChange,
}) => {
	const canGoBack = page > 0;
	const canGoForward = page < pageCount - 1;

	return (
		<div className="appleGuidePager">
			<button
				type="button"
				className="appleGuidePagerArrow appleGuidePagerArrowPrev"
				aria-label="Previous page"
				disabled={!canGoBack}
				onClick={() => onPageChange(page - 1)}
			/>
			<span className="appleGuidePagerPage">{page + 1}</span>
			<button
				type="button"
				className="appleGuidePagerArrow appleGuidePagerArrowNext"
				aria-label="Next page"
				disabled={!canGoForward}
				onClick={() => onPageChange(page + 1)}
			/>
		</div>
	);
};
