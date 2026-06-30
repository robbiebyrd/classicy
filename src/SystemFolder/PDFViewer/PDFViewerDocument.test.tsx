import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";

vi.mock("@/SystemFolder/PDFViewer/PDFViewerDocument.scss", () => ({}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

const {
	getDocumentMock,
	mockDoc,
	mockPage,
	mockLoadingTaskDestroy,
	RenderingCancelledExceptionMock,
} = vi.hoisted(() => {
	// Mirrors the real pdf.js RenderingCancelledException (a concrete,
	// instanceof-checkable class) closely enough for the component's
	// `reason instanceof RenderingCancelledException` check to work against
	// this mocked module.
	class RenderingCancelledExceptionMock extends Error {
		extraDelay: number;
		constructor(msg: string, extraDelay = 0) {
			super(msg);
			this.name = "RenderingCancelledException";
			this.extraDelay = extraDelay;
		}
	}
	const mockPage = {
		getViewport: vi.fn(() => ({ width: 100, height: 100 })),
		render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
	};
	const mockDoc = {
		numPages: 3,
		getPage: vi.fn(() => Promise.resolve(mockPage)),
	};
	const mockLoadingTaskDestroy = vi.fn();
	const getDocumentMock = vi.fn(() => ({
		promise: Promise.resolve(mockDoc),
		destroy: mockLoadingTaskDestroy,
	}));
	return {
		getDocumentMock,
		mockDoc,
		mockPage,
		mockLoadingTaskDestroy,
		RenderingCancelledExceptionMock,
	};
});

vi.mock("pdfjs-dist", () => ({
	getDocument: getDocumentMock,
	GlobalWorkerOptions: { workerSrc: "" },
	RenderingCancelledException: RenderingCancelledExceptionMock,
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
	default: "mock-worker-url",
}));

import { PDFViewerDocument } from "@/SystemFolder/PDFViewer/PDFViewerDocument";

beforeEach(() => {
	HTMLCanvasElement.prototype.getContext = vi.fn(
		() => ({}),
	) as unknown as typeof HTMLCanvasElement.prototype.getContext;
	getDocumentMock.mockClear();
	mockDoc.getPage.mockClear();
	mockLoadingTaskDestroy.mockClear();
	mockPage.render.mockClear();
});

describe("PDFViewerDocument", () => {
	it("shows a loading state before the document resolves", async () => {
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		expect(screen.getByText("Loading…")).toBeInTheDocument();
		await screen.findByText("Page 1 of 3");
	});

	it("renders the page counter once the document loads", async () => {
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
	});

	it("disables Previous on the first page and enables Next", async () => {
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");
		expect(screen.getByText("Previous")).toBeDisabled();
		expect(screen.getByText("Next")).not.toBeDisabled();
	});

	it("advances to the next page when Next is clicked", async () => {
		const user = userEvent.setup();
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");
		await user.click(screen.getByText("Next"));
		expect(await screen.findByText("Page 2 of 3")).toBeInTheDocument();
	});

	it("disables Next on the last page", async () => {
		const user = userEvent.setup();
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");
		await user.click(screen.getByText("Next"));
		await screen.findByText("Page 2 of 3");
		await user.click(screen.getByText("Next"));
		await screen.findByText("Page 3 of 3");
		expect(screen.getByText("Next")).toBeDisabled();
	});

	it("disables Zoom Out once the minimum scale is reached", async () => {
		const user = userEvent.setup();
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");
		for (let i = 0; i < 4; i++) {
			await user.click(screen.getByText("Zoom Out"));
		}
		expect(screen.getByText("Zoom Out")).toBeDisabled();
	});

	it("shows an error message (no toolbar) when the document fails to load", async () => {
		getDocumentMock.mockReturnValueOnce({
			promise: Promise.reject(new Error("boom")),
			destroy: vi.fn(),
		});
		render(<PDFViewerDocument url="http://example.com/broken.pdf" />);
		expect(
			await screen.findByText("Couldn't load this PDF."),
		).toBeInTheDocument();
		// There's no `doc`/`numPages` to navigate, so unlike a page-render
		// error, the toolbar has nothing useful to show here — full
		// replacement is correct for this case.
		expect(screen.queryByText("Next")).not.toBeInTheDocument();
		expect(screen.queryByText("Previous")).not.toBeInTheDocument();
	});

	it("shows a page error but keeps the toolbar visible and usable when a specific page fails to load", async () => {
		mockDoc.getPage.mockImplementationOnce(() =>
			Promise.reject(new Error("page boom")),
		);
		const user = userEvent.setup();
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);

		// The document loaded fine — only the current page failed — so the
		// toolbar (and the page counter) must stay present, not be replaced by
		// a full-component error like a document-load failure would be.
		expect(
			await screen.findByText("Couldn't render this page."),
		).toBeInTheDocument();
		expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
		expect(screen.getByText("Previous")).toBeInTheDocument();
		expect(screen.getByText("Next")).toBeInTheDocument();
		expect(screen.getByText("Next")).not.toBeDisabled();
		expect(screen.getByText("Zoom In")).not.toBeDisabled();
		expect(
			screen.queryByText("Couldn't load this PDF."),
		).not.toBeInTheDocument();

		// Clicking Next should be possible from the error state, and should
		// clear the per-page error once the next page renders successfully.
		await user.click(screen.getByText("Next"));
		expect(await screen.findByText("Page 2 of 3")).toBeInTheDocument();
		expect(
			screen.queryByText("Couldn't render this page."),
		).not.toBeInTheDocument();
	});

	it("destroys the loading task when the component unmounts", async () => {
		const { unmount } = render(
			<PDFViewerDocument url="http://example.com/sample.pdf" />,
		);
		await screen.findByText("Page 1 of 3");
		expect(mockLoadingTaskDestroy).not.toHaveBeenCalled();
		unmount();
		expect(mockLoadingTaskDestroy).toHaveBeenCalledTimes(1);
	});

	it("destroys the previous loading task when the url changes", async () => {
		const { rerender } = render(
			<PDFViewerDocument url="http://example.com/sample.pdf" />,
		);
		await screen.findByText("Page 1 of 3");
		expect(mockLoadingTaskDestroy).not.toHaveBeenCalled();
		rerender(<PDFViewerDocument url="http://example.com/other.pdf" />);
		expect(mockLoadingTaskDestroy).toHaveBeenCalledTimes(1);
		await screen.findByText("Page 1 of 3");
	});

	it("cancels the in-flight render task when the page changes again before it settles", async () => {
		const cancel = vi.fn();
		// Render never resolves/rejects for this test; we only care that the
		// task returned by page.render() gets cancelled by the next effect run.
		mockPage.render.mockReturnValueOnce({
			promise: new Promise(() => {}),
			cancel,
		});
		const user = userEvent.setup();
		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");
		await user.click(screen.getByText("Next"));
		await screen.findByText("Page 2 of 3");
		expect(cancel).toHaveBeenCalledTimes(1);
	});

	it("does not leave an unhandled rejection when a cancelled render task's promise rejects, and does not show an error", async () => {
		// Unlike the never-settling promise above, pdf.js actually rejects
		// `renderTask.promise` with a RenderingCancelledException once
		// `cancel()` runs. Wire `cancel` to reject the same promise the
		// component captured, then watch for a real Node unhandledRejection
		// to prove the component attaches its own handler rather than relying
		// on this test's assertions to coincidentally swallow it.
		let rejectRender: (reason?: unknown) => void = () => {};
		const cancel = vi.fn(() => {
			rejectRender(
				new RenderingCancelledExceptionMock("Rendering cancelled, page 1"),
			);
		});
		mockPage.render.mockReturnValueOnce({
			promise: new Promise((_resolve, reject) => {
				rejectRender = reject;
			}),
			cancel,
		});

		const unhandledRejections: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => {
			unhandledRejections.push(reason);
		};
		process.on("unhandledRejection", onUnhandledRejection);

		try {
			const user = userEvent.setup();
			render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
			await screen.findByText("Page 1 of 3");
			await user.click(screen.getByText("Next"));
			await screen.findByText("Page 2 of 3");
			expect(cancel).toHaveBeenCalledTimes(1);
			// Let the microtask queue flush the rejection (and any
			// unhandledRejection event Node would emit for it).
			await new Promise((resolve) => setTimeout(resolve, 0));
		} finally {
			process.removeListener("unhandledRejection", onUnhandledRejection);
		}

		expect(unhandledRejections).toHaveLength(0);
		expect(
			screen.queryByText("Couldn't load this PDF."),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Couldn't render this page."),
		).not.toBeInTheDocument();
	});

	it("shows a page error (toolbar still visible) when a render task fails for a reason other than cancellation", async () => {
		// A genuine pdf.js rendering failure (not a RenderingCancelledException)
		// must still surface to the user instead of being silently swallowed.
		// The rejection is held back until after the page has rendered (rather
		// than constructed pre-rejected) so the component's `.catch` has
		// already attached by the time it fires, same as the cancellation
		// test above — otherwise this would itself trip an
		// unhandled-rejection warning.
		let rejectRender: (reason?: unknown) => void = () => {};
		mockPage.render.mockReturnValueOnce({
			promise: new Promise((_resolve, reject) => {
				rejectRender = reject;
			}),
			cancel: vi.fn(),
		});

		render(<PDFViewerDocument url="http://example.com/sample.pdf" />);
		await screen.findByText("Page 1 of 3");

		rejectRender(new Error("canvas context lost"));

		expect(
			await screen.findByText("Couldn't render this page."),
		).toBeInTheDocument();
		// The document loaded fine, so the toolbar must stay usable.
		expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
		expect(screen.getByText("Next")).not.toBeDisabled();
	});
});
