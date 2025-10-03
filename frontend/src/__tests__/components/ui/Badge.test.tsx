import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Badge, StatusBadge } from '../../../components/ui/Badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should have base inline-flex styles', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('font-medium');
      expect(badge.className).toContain('transition-colors');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge.className).toContain('bg-gray-100');
      expect(badge.className).toContain('text-gray-800');
    });

    it('should apply primary variant styles', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-800');
    });

    it('should apply success variant styles', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    it('should apply danger variant styles', () => {
      render(<Badge variant="danger">Danger</Badge>);
      const badge = screen.getByText('Danger');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });

    it('should apply info variant styles', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toContain('bg-blue-50');
      expect(badge.className).toContain('text-blue-700');
    });
  });

  describe('Outlined Variant', () => {
    it('should apply outlined styles for default variant', () => {
      render(<Badge variant="default" outlined>Outlined</Badge>);
      const badge = screen.getByText('Outlined');
      expect(badge.className).toContain('border border-gray-300');
      expect(badge.className).toContain('text-gray-700');
      expect(badge.className).toContain('bg-transparent');
    });

    it('should apply outlined styles for primary variant', () => {
      render(<Badge variant="primary" outlined>Primary Outlined</Badge>);
      const badge = screen.getByText('Primary Outlined');
      expect(badge.className).toContain('border border-blue-300');
      expect(badge.className).toContain('text-blue-700');
    });

    it('should apply outlined styles for success variant', () => {
      render(<Badge variant="success" outlined>Success Outlined</Badge>);
      const badge = screen.getByText('Success Outlined');
      expect(badge.className).toContain('border border-green-300');
      expect(badge.className).toContain('text-green-700');
    });
  });

  describe('Sizes', () => {
    it('should apply small size styles', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
    });

    it('should apply medium size styles', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge.className).toContain('text-sm');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-1');
    });

    it('should apply large size styles', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge.className).toContain('text-base');
      expect(badge.className).toContain('px-3');
      expect(badge.className).toContain('py-1.5');
    });
  });

  describe('Shape', () => {
    it('should have rounded corners by default', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge.className).toContain('rounded');
    });

    it('should be fully rounded when rounded prop is true', () => {
      render(<Badge rounded>Pill</Badge>);
      const badge = screen.getByText('Pill');
      expect(badge.className).toContain('rounded-full');
    });
  });

  describe('Dot Indicator', () => {
    it('should not render dot by default', () => {
      const { container } = render(<Badge>No Dot</Badge>);
      const dot = container.querySelector('.w-2.h-2.rounded-full');
      expect(dot).not.toBeInTheDocument();
    });

    it('should render dot when dot prop is true', () => {
      const { container } = render(<Badge dot>With Dot</Badge>);
      const dot = container.querySelector('.w-2.h-2.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should apply correct dot color for default variant', () => {
      const { container } = render(<Badge variant="default" dot>Badge</Badge>);
      const dot = container.querySelector('.bg-gray-500');
      expect(dot).toBeInTheDocument();
    });

    it('should apply correct dot color for primary variant', () => {
      const { container } = render(<Badge variant="primary" dot>Badge</Badge>);
      const dot = container.querySelector('.bg-blue-500');
      expect(dot).toBeInTheDocument();
    });

    it('should apply correct dot color for success variant', () => {
      const { container } = render(<Badge variant="success" dot>Badge</Badge>);
      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
    });

    it('should apply correct dot color for warning variant', () => {
      const { container } = render(<Badge variant="warning" dot>Badge</Badge>);
      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
    });

    it('should apply correct dot color for danger variant', () => {
      const { container } = render(<Badge variant="danger" dot>Badge</Badge>);
      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
    });

    it('should have proper spacing for dot', () => {
      const { container } = render(<Badge dot>Badge</Badge>);
      const dot = container.querySelector('.mr-1\\.5');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge.className).toContain('custom-badge');
    });

    it('should forward HTML attributes', () => {
      render(<Badge data-testid="test-badge" aria-label="Test label">Badge</Badge>);
      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('aria-label', 'Test label');
    });
  });

  describe('Combined Props', () => {
    it('should combine size, variant, and rounded', () => {
      render(<Badge size="lg" variant="success" rounded>Complete</Badge>);
      const badge = screen.getByText('Complete');
      expect(badge.className).toContain('text-base');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('rounded-full');
    });

    it('should combine outlined, dot, and size', () => {
      const { container } = render(
        <Badge outlined dot size="sm" variant="danger">Alert</Badge>
      );
      const badge = screen.getByText('Alert');
      expect(badge.className).toContain('border border-red-300');
      expect(badge.className).toContain('text-xs');

      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
    });
  });
});

describe('StatusBadge Component', () => {
  describe('Conservation Status Rendering', () => {
    it('should render Least Concern status', () => {
      render(<StatusBadge status="LC" />);
      expect(screen.getByText('Least Concern')).toBeInTheDocument();
    });

    it('should render Near Threatened status', () => {
      render(<StatusBadge status="NT" />);
      expect(screen.getByText('Near Threatened')).toBeInTheDocument();
    });

    it('should render Vulnerable status', () => {
      render(<StatusBadge status="VU" />);
      expect(screen.getByText('Vulnerable')).toBeInTheDocument();
    });

    it('should render Endangered status', () => {
      render(<StatusBadge status="EN" />);
      expect(screen.getByText('Endangered')).toBeInTheDocument();
    });

    it('should render Critically Endangered status', () => {
      render(<StatusBadge status="CR" />);
      expect(screen.getByText('Critically Endangered')).toBeInTheDocument();
    });

    it('should render unknown status with default variant', () => {
      render(<StatusBadge status="UNKNOWN" />);
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });
  });

  describe('Variant Mapping', () => {
    it('should use success variant for Least Concern', () => {
      render(<StatusBadge status="LC" />);
      const badge = screen.getByText('Least Concern');
      expect(badge.className).toContain('bg-green-100');
    });

    it('should use warning variant for Near Threatened', () => {
      render(<StatusBadge status="NT" />);
      const badge = screen.getByText('Near Threatened');
      expect(badge.className).toContain('bg-yellow-100');
    });

    it('should use warning variant for Vulnerable', () => {
      render(<StatusBadge status="VU" />);
      const badge = screen.getByText('Vulnerable');
      expect(badge.className).toContain('bg-yellow-100');
    });

    it('should use danger variant for Endangered', () => {
      render(<StatusBadge status="EN" />);
      const badge = screen.getByText('Endangered');
      expect(badge.className).toContain('bg-red-100');
    });

    it('should use danger variant for Critically Endangered', () => {
      render(<StatusBadge status="CR" />);
      const badge = screen.getByText('Critically Endangered');
      expect(badge.className).toContain('bg-red-100');
    });

    it('should use default variant for unknown status', () => {
      render(<StatusBadge status="XYZ" />);
      const badge = screen.getByText('XYZ');
      expect(badge.className).toContain('bg-gray-100');
    });
  });

  describe('Custom Label', () => {
    it('should use custom label when provided', () => {
      render(<StatusBadge status="LC" label="Safe" />);
      expect(screen.getByText('Safe')).toBeInTheDocument();
      expect(screen.queryByText('Least Concern')).not.toBeInTheDocument();
    });

    it('should use custom label for unknown status', () => {
      render(<StatusBadge status="CUSTOM" label="Custom Status" />);
      expect(screen.getByText('Custom Status')).toBeInTheDocument();
    });
  });

  describe('Badge Properties', () => {
    it('should have small size', () => {
      render(<StatusBadge status="LC" />);
      const badge = screen.getByText('Least Concern');
      expect(badge.className).toContain('text-xs');
    });

    it('should be rounded', () => {
      render(<StatusBadge status="LC" />);
      const badge = screen.getByText('Least Concern');
      expect(badge.className).toContain('rounded-full');
    });
  });
});
