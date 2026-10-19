import "./ClassicyPager.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent } from "react";

type ClassicyPagerProps = {
	/** Zero-based current page; the cell shows it one-based. */
	page: number;
	/** Total number of pages; the forward arrow disables on the last one. */
	pageCount: number;
	/**
	 * Fired with the requested adjacent page (`page - 1` or `page + 1`) when an
	 * enabled arrow is clicked. Update `page` here to accept the move.
	 */
	onPageChange: (page: number) => void;
	/**
	 * Extra class for the page-number cell. Surfaces that shipped their own
	 * indicator before adopting this control (ClassicyAssistant) pass their
	 * historical class name here so consumer stylesheets keep matching.
	 */
	pageClassName?: string;
};

/**
 * The Platinum page control from the bottom-right of an Apple Guide window:
 * a back arrow, a recessed page-number cell, and a forward arrow. Arrow
 * enablement derives from position, so a one-page topic renders both arrows
 * disabled without a special case.
 *
 * Controlled only: it holds no index of its own and reports the requested
 * page through `onPageChange`, so the owner decides whether the move happens.
 * The arrows are real buttons ("Previous page" / "Next page"), so they are
 * keyboard-operable; the pager itself plays no sounds. `ClassicyAssistant`
 * uses it for its footer navigation.
 *
 * Disabled arrows are drawn hollow by punching their centre out in the colour
 * of the band behind the pager. That colour defaults to `--color-system-01`;
 * on any other background set `--classicy-pager-band` on an ancestor.
 *
 * ```tsx
 * <ClassicyPager page={page} pageCount={topics.length} onPageChange={setPage} />
 * ```
 */
export const ClassicyPager: FunctionalComponent<ClassicyPagerProps> = ({
	page,
	pageCount,
	onPageChange,
	pageClassName,
}) => {
	const canGoBack = page > 0;
	const canGoForward = page < pageCount - 1;

	return (
		<div className="classicyPager">
			<button
				type="button"
				className="classicyPagerArrow classicyPagerArrowPrev"
				aria-label="Previous page"
				disabled={!canGoBack}
				onClick={() => onPageChange(page - 1)}
			/>
			<span className={classNames("classicyPagerPage", pageClassName)}>
				{page + 1}
			</span>
			<button
				type="button"
				className="classicyPagerArrow classicyPagerArrowNext"
				aria-label="Next page"
				disabled={!canGoForward}
				onClick={() => onPageChange(page + 1)}
			/>
		</div>
	);
};
