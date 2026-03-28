import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/test-utils';
import { ClassicyControlLabel } from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel';

vi.mock('@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss', () => ({}));

describe('ClassicyControlLabel', () => {
  it('returns null when label is empty string (default)', () => {
    const { container } = render(<ClassicyControlLabel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders label text', () => {
    render(<ClassicyControlLabel label="My Label" />);
    expect(screen.getByText('My Label')).toBeInTheDocument();
  });

  it('sets htmlFor attribute on the label element', () => {
    render(<ClassicyControlLabel label="My Label" labelFor="my-input" />);
    const labelEl = screen.getByText('My Label');
    expect(labelEl.tagName).toBe('LABEL');
    expect(labelEl).toHaveAttribute('for', 'my-input');
  });

  it('calls onClickFunc when the outer div is clicked', async () => {
    const handler = vi.fn();
    const { userEvent } = await import('@/__tests__/test-utils');
    const user = userEvent.setup();
    const { container } = render(<ClassicyControlLabel label="Click Me" onClickFunc={handler} />);
    await user.click(container.firstChild as Element);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('renders an img element when icon prop is provided', () => {
    render(<ClassicyControlLabel label="With Icon" icon="/icon.png" />);
    const img = screen.getByRole('img', { name: 'With Icon' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/icon.png');
  });

  it('renders children on the left side when direction is left (default)', () => {
    render(
      <ClassicyControlLabel label="Label" direction="left">
        <button>Child</button>
      </ClassicyControlLabel>,
    );
    expect(screen.getByRole('button', { name: 'Child' })).toBeInTheDocument();
  });

  it('renders children on the right side when direction is right', () => {
    render(
      <ClassicyControlLabel label="Label" direction="right">
        <button>Child</button>
      </ClassicyControlLabel>,
    );
    expect(screen.getByRole('button', { name: 'Child' })).toBeInTheDocument();
  });
});
