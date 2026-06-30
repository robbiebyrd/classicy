import "./PDFViewerDocument.scss";
import {
	GlobalWorkerOptions,
	getDocument,
	type PDFDocumentProxy,
	type RenderTask,
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

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
	const [error, setError] = useState(false);

	// Load the document whenever the URL changes
	useEffect(() => {
		let cancelled = false;
		setDoc(null);
		setError(false);
		setCurrentPage(1);
		// `destroy()` lives on the loading task (not the resolved
		// PDFDocumentProxy), and is safe to call whether the load is still
		// in flight or has already settled — it aborts network requests and
		// tears down the worker/transport either way. Keeping the task in a
		// closure variable (rather than relying on `doc` state, which lags
		// one render behind) means cleanup always tears down the instance
		// that *this* effect run created, exactly once.
		const loadingTask = getDocument({ url });
		loadingTask.promise
			.then((loadedDoc) => {
				if (!cancelled) setDoc(loadedDoc);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
			loadingTask.destroy();
		};
	}, [url]);

	// Render the current page whenever the document, page, or zoom changes
	useEffect(() => {
		if (!doc || !canvasRef.current) return;
		let cancelled = false;
		let renderTask: RenderTask | null = null;
		doc
			.getPage(currentPage)
			.then((page) => {
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
				// That's expected, routine behavior, not a real error — swallow it
				// here so it never surfaces as an unhandled promise rejection.
				// Errors that aren't cancellations are still real render failures,
				// but pdf.js doesn't distinguish them on this promise, and a
				// flickered `error` state from a cancellation would be wrong, so
				// we deliberately don't call setError(true) from this handler.
				renderTask.promise.catch(() => {});
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
			renderTask?.cancel();
		};
	}, [doc, currentPage, scale]);

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
				<canvas ref={canvasRef} className="pdfViewerDocumentCanvas" />
			</div>
		</div>
	);
};
