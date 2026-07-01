import "./PDFViewerDocument.scss";
import type {
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	RenderTask,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
	type FC as FunctionalComponent,
	useEffect,
	useRef,
	useState,
} from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

// pdfjs-dist's canvas module references the browser-only `DOMMatrix` global
// at module-evaluation time. A static import here would run that the instant
// anything is imported from the classicy barrel — crashing any consumer's
// non-browser environment (Node, test runners, SSR) even if they never
// render a PDFViewer. Load it lazily instead, once, on first use.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
	if (!pdfjsPromise) {
		pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
			pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
			return pdfjs;
		});
	}
	return pdfjsPromise;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

interface PDFViewerDocumentProps {
	url: string;
}

export const PDFViewerDocument: FunctionalComponent<PDFViewerDocumentProps> = ({
	url,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [scale, setScale] = useState(1.0);
	// `error` means the document itself failed to load — there's no `doc`,
	// no `numPages`, and nothing for a toolbar to navigate, so this still
	// replaces the entire component output below.
	const [error, setError] = useState(false);
	// `pageError` means the document loaded fine but the *current* page
	// failed to render. The toolbar must stay usable here (e.g. to click
	// Next/Previous away from the bad page), so this only swaps out the
	// canvas-display area, not the whole component. Kept separate from
	// `error` so the two failure modes can't clobber each other.
	const [pageError, setPageError] = useState(false);

	// Load the document whenever the URL changes
	useEffect(() => {
		let cancelled = false;
		// `destroy()` lives on the loading task (not the resolved
		// PDFDocumentProxy), and is safe to call whether the load is still
		// in flight or has already settled — it aborts network requests and
		// tears down the worker/transport either way. Assigned once pdfjs
		// finishes loading and the task is actually created, so cleanup always
		// tears down the instance that *this* effect run created, exactly once.
		let loadingTask: PDFDocumentLoadingTask | null = null;
		setDoc(null);
		setError(false);
		setPageError(false);
		setCurrentPage(1);
		loadPdfjs()
			.then((pdfjs) => {
				if (cancelled) return undefined;
				loadingTask = pdfjs.getDocument({ url });
				return loadingTask.promise;
			})
			.then((loadedDoc) => {
				if (!cancelled && loadedDoc) setDoc(loadedDoc);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
			loadingTask?.destroy();
		};
	}, [url]);

	// Render the current page whenever the document, page, or zoom changes
	useEffect(() => {
		if (!doc || !canvasRef.current) return;
		let cancelled = false;
		let renderTask: RenderTask | null = null;
		// Reset any stale per-page error from a previous page/zoom before
		// attempting this render — e.g. clicking Next away from a page that
		// failed to render should give the new page a clean slate rather than
		// inheriting the old error.
		setPageError(false);
		Promise.all([doc.getPage(currentPage), loadPdfjs()])
			.then(([page, pdfjs]) => {
				if (cancelled || !canvasRef.current) return;
				const viewport = page.getViewport({ scale });
				const context = canvasRef.current.getContext("2d");
				if (!context) return;
				canvasRef.current.width = viewport.width;
				canvasRef.current.height = viewport.height;
				renderTask = page.render({
					canvas: canvasRef.current,
					canvasContext: context,
					viewport,
				});
				// `renderTask.promise` rejects with a RenderingCancelledException
				// whenever cleanup calls `renderTask.cancel()` below (e.g. a fast
				// Next/Previous or Zoom click while a page is still rendering).
				// That's expected, routine behavior, not a real error — swallow
				// only that case so it never surfaces as an unhandled promise
				// rejection. Any other rejection reason is a genuine render
				// failure, so surface it the same way the catch handlers above
				// do. This is a *page*-render failure (the document already
				// loaded fine), so it sets `pageError`, not `error`.
				renderTask.promise.catch((reason: unknown) => {
					if (reason instanceof pdfjs.RenderingCancelledException) return;
					if (!cancelled) setPageError(true);
				});
			})
			.catch(() => {
				if (!cancelled) setPageError(true);
			});
		return () => {
			cancelled = true;
			renderTask?.cancel();
		};
	}, [doc, currentPage, scale]);

	// A document-load failure means there's no `doc`, no `numPages`, and
	// nothing for a toolbar to navigate — full replacement is the only
	// sensible option here.
	if (error) {
		return <p className="pdfViewerDocumentError">Couldn't load this PDF.</p>;
	}

	if (!doc) {
		return <p className="pdfViewerDocumentLoading">Loading…</p>;
	}

	const numPages = doc.numPages;

	return (
		<div className="pdfViewerDocument">
			<div className="pdfViewerDocumentToolbar">
				<ClassicyButton
					buttonSize="small"
					disabled={currentPage <= 1}
					onClickFunc={() => setCurrentPage((p) => Math.max(1, p - 1))}
				>
					Previous
				</ClassicyButton>
				<ClassicyControlLabel label={`Page ${currentPage} of ${numPages}`} />
				<ClassicyButton
					buttonSize="small"
					disabled={currentPage >= numPages}
					onClickFunc={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
				>
					Next
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					disabled={scale <= MIN_SCALE}
					onClickFunc={() =>
						setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
					}
				>
					Zoom Out
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					disabled={scale >= MAX_SCALE}
					onClickFunc={() =>
						setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
					}
				>
					Zoom In
				</ClassicyButton>
			</div>
			<div className="pdfViewerDocumentCanvasWrapper">
				{pageError ? (
					<p className="pdfViewerDocumentPageError">
						Couldn't render this page.
					</p>
				) : null}
				<canvas
					ref={canvasRef}
					className="pdfViewerDocumentCanvas"
					hidden={pageError}
				/>
			</div>
		</div>
	);
};
