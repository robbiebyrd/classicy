/* eslint-disable react-refresh/only-export-components -- Test utilities, not components */
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { ...options });
}
