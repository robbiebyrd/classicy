/* eslint-disable react-refresh/only-export-components -- Test utilities, not components */
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
	return render(ui, { ...options });
}
