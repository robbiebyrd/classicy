import { describe, it, expect, vi } from 'vitest';
import { render } from '@/__tests__/test-utils';
import { ClassicyProgressBar } from '@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar';

vi.mock('@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss', () => ({}));

describe('ClassicyProgressBar', () => {
  it('renders a progress element', () => {
    const { container } = render(<ClassicyProgressBar />);
    expect(container.querySelector('progress')).toBeInTheDocument();
  });

  it('uses determinate class by default', () => {
    const { container } = render(<ClassicyProgressBar />);
    const wrapper = container.firstChild as Element;
    expect(wrapper).toHaveClass('classicyProgressDeterminate');
    expect(wrapper).not.toHaveClass('classicyProgressIndeterminate');
  });

  it('uses indeterminate class when indeterminate=true', () => {
    const { container } = render(<ClassicyProgressBar indeterminate={true} />);
    const wrapper = container.firstChild as Element;
    expect(wrapper).toHaveClass('classicyProgressIndeterminate');
    expect(wrapper).not.toHaveClass('classicyProgressDeterminate');
  });

  it('reflects value and max on the progress element for determinate mode', () => {
    const { container } = render(<ClassicyProgressBar value={40} max={200} />);
    const progress = container.querySelector('progress')!;
    expect(progress).toHaveAttribute('value', '40');
    expect(progress).toHaveAttribute('max', '200');
  });

  it('forces max=100 and value=100 when indeterminate=true', () => {
    const { container } = render(<ClassicyProgressBar value={30} max={50} indeterminate={true} />);
    const progress = container.querySelector('progress')!;
    expect(progress).toHaveAttribute('value', '100');
    expect(progress).toHaveAttribute('max', '100');
  });
});
