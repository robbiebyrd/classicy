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

const { getDocumentMock, mockDoc } = vi.hoisted(() => {
	const mockPage = {
		getViewport: vi.fn(() => ({ width: 100, height: 100 })),
		render: vi.fn(() => ({ promise: Promise.resolve() })),
	};
	const mockDoc = {
		numPages: 3,
		getPage: vi.fn(() => Promise.resolve(mockPage)),
	};
	const getDocumentMock = vi.fn(() => ({
		promise: Promise.resolve(mockDoc),
	}));
	return { getDocumentMock, mockDoc, mockPage };
});

vi.mock("pdfjs-dist", () => ({
	getDocument: getDocumentMock,
	GlobalWorkerOptions: { workerSrc: "" },
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

	it("shows an error message when the document fails to load", async () => {
		getDocumentMock.mockReturnValueOnce({
			promise: Promise.reject(new Error("boom")),
		});
		render(<PDFViewerDocument url="http://example.com/broken.pdf" />);
		expect(
			await screen.findByText("Couldn't load this PDF."),
		).toBeInTheDocument();
	});
});
