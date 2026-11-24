import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// The floating windows of every extension stack together, by recency.
describe("floating windows of two extensions", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("a click raises one extension's window over the other's", () => {
		render(
			<>
				{["ExtA.app", "ExtB.app"].map((id) => (
					<ClassicyApp key={id} id={id} name={id} icon="" extension>
						<ClassicyWindow
							id="f"
							appId={id}
							title={id}
							initialSize={[100, 60]}
							initialPosition={[10, 10]}
						>
							<p>{id}</p>
						</ClassicyWindow>
					</ClassicyApp>
				))}
			</>,
		);
		act(() => {
			for (const id of ["ExtA.app", "ExtB.app"])
				dispatch({ type: "ClassicyAppOpen", app: { id, name: id, icon: "" } });
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "ExtA.app" },
				window: { id: "f", menuBar: [] },
			});
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "ExtB.app" },
				window: { id: "f", menuBar: [] },
			});
		});
		const z = (id: string) =>
			Number(document.getElementById(`${id}_f`)?.style.zIndex);
		expect(z("ExtB.app")).toBe(354);
		expect(z("ExtA.app")).toBe(353);
		const a = document.getElementById("ExtA.app_f") as HTMLElement;
		fireEvent.mouseUp(a);
		fireEvent.click(a);
		expect(z("ExtA.app")).toBe(354);
		expect(z("ExtB.app")).toBe(353);
	});
});
