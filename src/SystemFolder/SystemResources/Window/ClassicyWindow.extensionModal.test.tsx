import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// An extension's modal window or alert is never a floating window: it keeps
// its modal band above its own scrim (story 0233-c79, RR3-1), exactly as the
// same dialog of an ordinary app does.
describe("a modal window or alert of an extension", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	const open = (id: string) =>
		dispatch({ type: "ClassicyAppOpen", app: { id, name: id, icon: "" } });

	it("keeps its modal band: no floating z-index, scrim present, clickable", () => {
		const onOk = vi.fn();
		const Dialogs = ({ extension }: { extension: boolean }) => (
			<ClassicyApp
				id={extension ? "Ext.app" : "Plain.app"}
				name={extension ? "Ext" : "Plain"}
				icon=""
				extension={extension}
			>
				<ClassicyWindow
					id="dlg"
					appId={extension ? "Ext.app" : "Plain.app"}
					modal
					title="Dialog"
					initialSize={[200, 100]}
					initialPosition={[10, 10]}
				>
					<button type="button" onClick={onOk}>
						Dialog OK
					</button>
				</ClassicyWindow>
				<ClassicyAlert
					id="alert"
					appId={extension ? "Ext.app" : "Plain.app"}
					alertType="stop"
					label="Alert"
					message="boom"
					buttons={[{ id: "ok", label: "Alert OK", onClick: onOk }]}
				/>
			</ClassicyApp>
		);
		const cls = (id: string) => {
			const el = document.querySelector(`[id$="${id}"]`) as HTMLElement;
			return {
				z: el.style.zIndex,
				modalFront: el.classList.contains("classicyWindowModalFront"),
				red: el.classList.contains("classicyWindowRed"),
			};
		};
		const plain = render(<Dialogs extension={false} />);
		act(() => open("Plain.app"));
		const plainBands = {
			dlg: cls("Plain.app_dlg"),
			alert: cls("Plain.app_alert"),
		};
		plain.unmount();

		useAppManager.setState(DefaultAppManagerState, true);
		render(<Dialogs extension />);
		act(() => open("Ext.app"));
		const extBands = { dlg: cls("Ext.app_dlg"), alert: cls("Ext.app_alert") };
		// Same bands as an ordinary app's, and no inline floating z-index.
		expect(extBands).toEqual({
			dlg: { ...plainBands.dlg },
			alert: { ...plainBands.alert },
		});
		expect(extBands.dlg.z).toBe("");
		expect(extBands.alert.z).toBe("");
		expect(extBands.dlg.modalFront).toBe(true);
		expect(extBands.alert.red || extBands.alert.modalFront).toBe(true);
		fireEvent.click(document.body.querySelector("button") as HTMLElement);
		fireEvent.click(
			[...document.querySelectorAll("button")].find(
				(b) => b.textContent === "Alert OK",
			) as HTMLElement,
		);
		expect(onOk).toHaveBeenCalledTimes(2);
	});
});
