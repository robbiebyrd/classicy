import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyForm } from "@/SystemFolder/SystemResources/Form/ClassicyForm";
import { ClassicyInputDialog } from "@/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog";
import { ClassicyKeyboardEquivalentDialog } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentDialog";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	ClassicyWindowSelfPadding,
	useClassicyWindowSelfPadding,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding";

// A modal's inner area carries `classicyWindowContentsSelfPadded` while its
// content lays itself out from the window's edge (an alert, the input and
// keyboard-equivalent dialogs, a dialog-layout form), so a package can drop
// its own inset for those without `:has()` (story 0201-uj9: System 7, and
// Firefox 113-120, which has no `:has()`).

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

const SELF_PADDED = "classicyWindowContentsSelfPadded";

beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

/** Every modal inner area in the document (modals portal into the desktop). */
const inners = () =>
	Array.from(document.querySelectorAll(".classicyWindowContentsModalInner"));
const inner = () => {
	const all = inners();
	expect(all).toHaveLength(1);
	return all[0];
};

const Modal = ({ children }: { children?: React.ReactNode }) => (
	<ClassicyWindow id="dialog" appId="TestApp" title="Dialog" modal>
		{children}
	</ClassicyWindow>
);

describe("the self-padded marker on a modal's inner area", () => {
	it("marks an alert's window", () => {
		render(<ClassicyAlert label="Note" />);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("marks a movable alert's window", () => {
		render(<ClassicyAlert label="Note" movable />);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("marks an input dialog's window", () => {
		render(
			<ClassicyInputDialog
				id="input"
				title="New Folder"
				prompt="Name:"
				onConfirm={() => {}}
				onCancel={() => {}}
			/>,
		);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("marks a keyboard-equivalent dialog's window", () => {
		render(<ClassicyKeyboardEquivalentDialog onConfirm={() => {}} />);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("marks a modal holding a dialog-layout form", () => {
		render(
			<Modal>
				<ClassicyForm layout="dialog">
					<input />
				</ClassicyForm>
			</Modal>,
		);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("leaves a modal holding a default-layout form unmarked", () => {
		render(
			<Modal>
				<ClassicyForm>
					<input />
				</ClassicyForm>
			</Modal>,
		);
		expect(inner()).not.toHaveClass(SELF_PADDED);
	});

	it("leaves a modal with ordinary content unmarked", () => {
		render(
			<Modal>
				<p>content</p>
			</Modal>,
		);
		expect(inner()).not.toHaveClass(SELF_PADDED);
	});

	it("never marks a non-modal window's inner area", () => {
		render(
			<ClassicyWindow id="doc" appId="TestApp" title="Doc">
				<ClassicyForm layout="dialog">
					<input />
				</ClassicyForm>
			</ClassicyWindow>,
		);
		const docInner = document.querySelector(".classicyWindowContentsInner");
		expect(docInner).not.toBeNull();
		expect(docInner).not.toHaveClass(SELF_PADDED);
	});

	it("follows the content: drops the marker when the self-padding content goes", () => {
		const Toggle = () => {
			const [form, setForm] = useState(true);
			return (
				<Modal>
					{form ? (
						<ClassicyForm layout="dialog">
							<input />
						</ClassicyForm>
					) : (
						<p>plain</p>
					)}
					<button type="button" onClick={() => setForm(!form)}>
						toggle
					</button>
				</Modal>
			);
		};
		const { getByText } = render(<Toggle />);
		expect(inner()).toHaveClass(SELF_PADDED);
		fireEvent.click(getByText("toggle"));
		expect(inner()).not.toHaveClass(SELF_PADDED);
		fireEvent.click(getByText("toggle"));
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("counts its claimants: one leaving keeps another's marker", () => {
		const Two = () => {
			const [both, setBoth] = useState(true);
			return (
				<Modal>
					<ClassicyForm layout="dialog">
						<input />
					</ClassicyForm>
					{both && (
						<ClassicyWindowSelfPadding>
							<p>second</p>
						</ClassicyWindowSelfPadding>
					)}
					<button type="button" onClick={() => setBoth(false)}>
						drop
					</button>
				</Modal>
			);
		};
		const { getByText } = render(<Two />);
		expect(inner()).toHaveClass(SELF_PADDED);
		fireEvent.click(getByText("drop"));
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	// A claimant that passes its root (the four dialogs do) claims only when
	// that root is the window's content root, a direct child of the inner
	// area, as the old `:has(> …)` matched. Nested deeper, or rendered
	// through a portal, it does not claim, so the window keeps its inset.
	describe("a claim with a root ref covers the content root only", () => {
		it("a dialog form nested below the content root does not mark the window", () => {
			render(
				<Modal>
					<p>other content</p>
					<div>
						<ClassicyForm layout="dialog">
							<input />
						</ClassicyForm>
					</div>
				</Modal>,
			);
			expect(inner()).not.toHaveClass(SELF_PADDED);
		});

		it("a dialog form rendered through a portal does not mark the window", () => {
			const target = document.createElement("div");
			document.body.appendChild(target);
			try {
				render(
					<Modal>
						<p>content</p>
						{createPortal(
							<ClassicyForm layout="dialog">
								<input />
							</ClassicyForm>,
							target,
						)}
					</Modal>,
				);
				expect(inner()).not.toHaveClass(SELF_PADDED);
			} finally {
				target.remove();
			}
		});

		it("the wrapper with a rootRef claims as the root, not when nested", () => {
			const Host = ({ nested }: { nested: boolean }) => {
				const ref = useRef<HTMLDivElement>(null);
				const root = (
					<ClassicyWindowSelfPadding rootRef={ref}>
						<div ref={ref}>host</div>
					</ClassicyWindowSelfPadding>
				);
				return <Modal>{nested ? <section>{root}</section> : root}</Modal>;
			};
			const { unmount } = render(<Host nested={false} />);
			expect(inner()).toHaveClass(SELF_PADDED);
			unmount();
			render(<Host nested={true} />);
			expect(inner()).not.toHaveClass(SELF_PADDED);
		});

		it("follows a non-modal window made modal: the root claims once it is", () => {
			const Flip = () => {
				const [modal, setModal] = useState(false);
				return (
					<>
						<ClassicyWindow
							id="flip"
							appId="TestApp"
							title="Flip"
							modal={modal}
						>
							<ClassicyForm layout="dialog">
								<input />
							</ClassicyForm>
						</ClassicyWindow>
						<button type="button" onClick={() => setModal(true)}>
							modal
						</button>
					</>
				);
			};
			const { getByText } = render(<Flip />);
			expect(inners()).toHaveLength(0);
			fireEvent.click(getByText("modal"));
			expect(inner()).toHaveClass(SELF_PADDED);
		});

		// Without a ref the hook keeps the whole-window contract: a claim from
		// anywhere in the window's tree marks it.
		it("a claim without a root ref still covers the whole content", () => {
			const Deep = () => {
				useClassicyWindowSelfPadding();
				return <span>deep</span>;
			};
			render(
				<Modal>
					<div>
						<Deep />
					</div>
				</Modal>,
			);
			expect(inner()).toHaveClass(SELF_PADDED);
		});
	});

	it("marks only the nearest window: a document window holding an alert stays unmarked", () => {
		render(
			<ClassicyWindow id="doc" appId="TestApp" title="Doc" modal>
				<p>document</p>
				<ClassicyAlert id="nested-alert" label="Note" />
			</ClassicyWindow>,
		);
		const [outer, alertInner] = [
			document
				.getElementById("TestApp_doc")
				?.querySelector(".classicyWindowContentsModalInner"),
			document
				.querySelector(".classicyAlert")
				?.closest(".classicyWindowContentsModalInner"),
		];
		expect(outer).not.toBeNull();
		expect(alertInner).not.toBeNull();
		expect(outer).not.toBe(alertInner);
		expect(outer).not.toHaveClass(SELF_PADDED);
		expect(alertInner).toHaveClass(SELF_PADDED);
	});

	it("lets a host's own content claim it, through the component or the hook", () => {
		const HostDialog = () => {
			useClassicyWindowSelfPadding();
			return <div>host</div>;
		};
		const { unmount } = render(
			<Modal>
				<HostDialog />
			</Modal>,
		);
		expect(inner()).toHaveClass(SELF_PADDED);
		unmount();
		render(
			<Modal>
				<ClassicyWindowSelfPadding>
					<div>host</div>
				</ClassicyWindowSelfPadding>
			</Modal>,
		);
		expect(inner()).toHaveClass(SELF_PADDED);
	});

	it("is a no-op outside any window", () => {
		const Loose = () => {
			useClassicyWindowSelfPadding();
			return <span>loose</span>;
		};
		expect(() => render(<Loose />)).not.toThrow();
	});
});
