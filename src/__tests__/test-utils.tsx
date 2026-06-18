/* eslint-disable react-refresh/only-export-components -- Test utilities, not components */
import {
	type RenderOptions,
	type RenderResult,
	render,
} from "@testing-library/react";
import type { ReactElement } from "react";

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

export function renderWithProviders(
	ui: ReactElement,
	options?: RenderOptions,
): RenderResult {
	return render(ui, { ...options });
}
