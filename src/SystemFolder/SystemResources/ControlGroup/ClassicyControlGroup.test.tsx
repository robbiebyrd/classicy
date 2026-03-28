import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/test-utils';
import { ClassicyControlGroup } from '@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup';

vi.mock('@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss', () => ({}));

describe('ClassicyControlGroup', () => {
  it('renders label as a legend element', () => {
    render(<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>);
    expect(screen.getByText('Settings').tagName).toBe('LEGEND');
  });

  it('renders children inside the fieldset', () => {
    render(
      <ClassicyControlGroup label="Group">
        <span>Child content</span>
      </ClassicyControlGroup>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('applies columns class when columns=true', () => {
    const { container } = render(
      <ClassicyControlGroup label="Group" columns={true}>
        {null}
      </ClassicyControlGroup>,
    );
    // The div wrapping children should have the columns class
    const colDiv = container.querySelector('.classicyControlGroupContentColumns');
    expect(colDiv).toBeInTheDocument();
  });

  it('does not apply columns class when columns=false (default)', () => {
    const { container } = render(
      <ClassicyControlGroup label="Group">
        {null}
      </ClassicyControlGroup>,
    );
    const colDiv = container.querySelector('.classicyControlGroupContentColumns');
    expect(colDiv).not.toBeInTheDocument();
  });

  it('renders no legend element when label is empty string', () => {
    const { container } = render(
      <ClassicyControlGroup label="">
        {null}
      </ClassicyControlGroup>,
    );
    expect(container.querySelector('legend')).not.toBeInTheDocument();
  });
});
