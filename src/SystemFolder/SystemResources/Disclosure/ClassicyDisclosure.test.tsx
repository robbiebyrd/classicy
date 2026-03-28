import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/__tests__/test-utils';
import { ClassicyDisclosure } from '@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure';

vi.mock('@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics', () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock('@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss', () => ({}));
vi.mock('@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss', () => ({}));

describe('ClassicyDisclosure', () => {
  it('renders with closed class by default', () => {
    const { container } = render(<ClassicyDisclosure label="More info" />);
    const inner = container.querySelector('.classicyDisclosureInner');
    expect(inner).toHaveClass('classicyDisclosureInnerClose');
    expect(inner).not.toHaveClass('classicyDisclosureInnerOpen');
  });

  it('toggles to open class when header is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassicyDisclosure label="More info" />);
    const header = container.querySelector('.classicyDisclosureHeader') as HTMLElement;
    await user.click(header);
    const inner = container.querySelector('.classicyDisclosureInner');
    expect(inner).toHaveClass('classicyDisclosureInnerOpen');
    expect(inner).not.toHaveClass('classicyDisclosureInnerClose');
  });

  it('toggles back to closed class on second click', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassicyDisclosure label="More info" />);
    const header = container.querySelector('.classicyDisclosureHeader') as HTMLElement;
    await user.click(header);
    await user.click(header);
    const inner = container.querySelector('.classicyDisclosureInner');
    expect(inner).toHaveClass('classicyDisclosureInnerClose');
  });

  it('renders children inside the disclosure inner div', () => {
    render(
      <ClassicyDisclosure label="Section">
        <p>Hidden content</p>
      </ClassicyDisclosure>,
    );
    expect(screen.getByText('Hidden content')).toBeInTheDocument();
  });

  it('renders the label text', () => {
    render(<ClassicyDisclosure label="Show details" />);
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('toggles open on Enter key press', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassicyDisclosure label="More info" />);
    const header = container.querySelector('.classicyDisclosureHeader') as HTMLElement;
    header.focus();
    await user.keyboard('{Enter}');
    const inner = container.querySelector('.classicyDisclosureInner');
    expect(inner).toHaveClass('classicyDisclosureInnerOpen');
  });

  it('toggles open on Space key press', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassicyDisclosure label="More info" />);
    const header = container.querySelector('.classicyDisclosureHeader') as HTMLElement;
    header.focus();
    await user.keyboard(' ');
    const inner = container.querySelector('.classicyDisclosureInner');
    expect(inner).toHaveClass('classicyDisclosureInnerOpen');
  });
});
