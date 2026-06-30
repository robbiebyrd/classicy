import "./PDFViewerDocument.scss";
import {
	GlobalWorkerOptions,
	getDocument,
	type PDFDocumentProxy,
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
		getDocument({ url })
			.promise.then((loadedDoc) => {
				if (!cancelled) setDoc(loadedDoc);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
		};
	}, [url]);

	// Render the current page whenever the document, page, or zoom changes
	useEffect(() => {
		if (!doc || !canvasRef.current) return;
		let cancelled = false;
		doc.getPage(currentPage).then((page) => {
			if (cancelled || !canvasRef.current) return;
			const viewport = page.getViewport({ scale });
			const context = canvasRef.current.getContext("2d");
			if (!context) return;
			canvasRef.current.width = viewport.width;
			canvasRef.current.height = viewport.height;
			page.render({
				canvas: canvasRef.current,
				canvasContext: context,
				viewport,
			});
		});
		return () => {
			cancelled = true;
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
