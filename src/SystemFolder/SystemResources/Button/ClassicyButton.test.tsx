import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/__tests__/test-utils';
import { ClassicyButton } from '@/SystemFolder/SystemResources/Button/ClassicyButton';

vi.mock('@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics', () => ({
  useClassicyAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock('@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext', () => ({
  useSoundDispatch: () => vi.fn(),
}));

vi.mock('@/SystemFolder/SystemResources/Button/ClassicyButton.scss', () => ({}));

describe('ClassicyButton', () => {
  it('renders button with children as text', () => {
    render(<ClassicyButton>Click me</ClassicyButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClickFunc when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ClassicyButton onClickFunc={onClick}>Action</ClassicyButton>);
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled prop — button is disabled and click does not fire', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ClassicyButton disabled={true} onClickFunc={onClick}>
        Disabled
      </ClassicyButton>,
    );
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('adds classicyButtonDefault class when isDefault=true', () => {
    render(<ClassicyButton isDefault={true}>OK</ClassicyButton>);
    expect(screen.getByRole('button', { name: 'OK' })).toHaveClass('classicyButtonDefault');
  });

  it('does not add classicyButtonDefault class when isDefault=false (default)', () => {
    render(<ClassicyButton>Cancel</ClassicyButton>);
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveClass('classicyButtonDefault');
  });

  it('has type="button" by default', () => {
    render(<ClassicyButton>Submit</ClassicyButton>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'button');
  });

  it('uses the provided buttonType', () => {
    render(<ClassicyButton buttonType="submit">Go</ClassicyButton>);
    // role is set to the buttonType value in the component
    const btn = document.querySelector('button[type="submit"]');
    expect(btn).toBeInTheDocument();
  });
});
