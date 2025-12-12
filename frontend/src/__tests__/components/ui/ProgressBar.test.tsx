import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { ProgressBar, CircularProgress } from '../../../components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  describe('Rendering', () => {
    it('should render progress bar', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have correct aria attributes', () => {
      render(<ProgressBar value={30} max={100} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '30');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should calculate percentage correctly', () => {
      const { container } = render(<ProgressBar value={50} max={100} />);
      const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.style.width).toBe('50%');
    });
  });

  describe('Value Handling', () => {
    it('should clamp value to max', () => {
      const { container } = render(<ProgressBar value={150} max={100} />);
      const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.style.width).toBe('100%');
    });

    it('should clamp negative values to 0', () => {
      const { container } = render(<ProgressBar value={-10} />);
      const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.style.width).toBe('0%');
    });

    it('should use default max of 100', () => {
      const { container } = render(<ProgressBar value={75} />);
      const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.style.width).toBe('75%');
    });

    it('should handle custom max value', () => {
      const { container } = render(<ProgressBar value={50} max={200} />);
      const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.style.width).toBe('25%');
    });
  });

  describe('Sizes', () => {
    it('should apply small size', () => {
      const { container } = render(<ProgressBar value={50} size="sm" />);
      const wrapper = container.querySelector('.h-1');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply medium size by default', () => {
      const { container } = render(<ProgressBar value={50} />);
      const wrapper = container.querySelector('.h-3');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(<ProgressBar value={50} size="lg" />);
      const wrapper = container.querySelector('.h-4');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('should use primary color by default', () => {
      const { container } = render(<ProgressBar value={50} />);
      const bar = container.querySelector('.bg-blue-600');
      expect(bar).toBeInTheDocument();
    });

    it('should apply success color', () => {
      const { container } = render(<ProgressBar value={50} color="success" />);
      const bar = container.querySelector('.bg-green-500');
      expect(bar).toBeInTheDocument();
    });

    it('should apply warning color', () => {
      const { container } = render(<ProgressBar value={50} color="warning" />);
      const bar = container.querySelector('.bg-yellow-500');
      expect(bar).toBeInTheDocument();
    });

    it('should apply danger color', () => {
      const { container } = render(<ProgressBar value={50} color="danger" />);
      const bar = container.querySelector('.bg-red-600');
      expect(bar).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should use default variant', () => {
      const { container } = render(<ProgressBar value={50} variant="default" />);
      const bar = container.querySelector('.bg-blue-600');
      expect(bar).toBeInTheDocument();
    });

    it('should use gradient variant', () => {
      const { container } = render(<ProgressBar value={50} variant="gradient" color="primary" />);
      const bar = container.querySelector('.bg-gradient-to-r.from-blue-400.to-blue-600');
      expect(bar).toBeInTheDocument();
    });

    it('should use striped variant', () => {
      const { container } = render(<ProgressBar value={50} variant="striped" />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).toContain('bg-blue-600');
    });

    it('should apply gradient with different colors', () => {
      const { container } = render(
        <ProgressBar value={50} variant="gradient" color="success" />
      );
      const bar = container.querySelector('.bg-gradient-to-r.from-green-400.to-green-600');
      expect(bar).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('should not show label by default', () => {
      render(<ProgressBar value={50} />);
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<ProgressBar value={50} showLabel />);
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show custom label', () => {
      render(<ProgressBar value={75} label="Loading" showLabel />);
      expect(screen.getByText('Loading')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show label without showLabel if label prop is provided', () => {
      render(<ProgressBar value={60} label="Custom Progress" />);
      expect(screen.getByText('Custom Progress')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should round percentage in label', () => {
      render(<ProgressBar value={33.333} showLabel />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should not animate by default', () => {
      render(<ProgressBar value={50} />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).not.toContain('animate-pulse');
    });

    it('should animate when animated prop is true', () => {
      render(<ProgressBar value={50} animated />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).toContain('animate-pulse');
    });

    it('should have transition', () => {
      render(<ProgressBar value={50} />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).toContain('transition-all');
      expect(bar.className).toContain('duration-500');
    });
  });

  describe('Styling', () => {
    it('should have rounded container', () => {
      const { container } = render(<ProgressBar value={50} />);
      const wrapper = container.querySelector('.bg-gray-200.rounded-full');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have rounded bar', () => {
      render(<ProgressBar value={50} />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).toContain('rounded-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<ProgressBar value={50} className="custom-progress" />);
      expect(container.querySelector('.custom-progress')).toBeInTheDocument();
    });
  });
});

describe('CircularProgress Component', () => {
  describe('Rendering', () => {
    it('should render SVG', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render two circles', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(2);
    });

    it('should show percentage label by default', () => {
      render(<CircularProgress value={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<CircularProgress value={50} showLabel={false} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('Value Handling', () => {
    it('should calculate percentage correctly', () => {
      render(<CircularProgress value={25} max={100} />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should clamp value to max', () => {
      render(<CircularProgress value={150} max={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should clamp negative values to 0', () => {
      render(<CircularProgress value={-10} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle custom max value', () => {
      render(<CircularProgress value={50} max={200} />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should round percentage', () => {
      render(<CircularProgress value={33.333} />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('Size', () => {
    it('should use default size of 120px', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '120');
    });

    it('should use custom size', () => {
      const { container } = render(<CircularProgress value={50} size={200} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '200');
      expect(svg).toHaveAttribute('height', '200');
    });

    it('should set container dimensions based on size', () => {
      const { container } = render(<CircularProgress value={50} size={150} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.width).toBe('150px');
      expect(wrapper.style.height).toBe('150px');
    });
  });

  describe('Stroke Width', () => {
    it('should use default stroke width of 8', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach(circle => {
        expect(circle).toHaveAttribute('stroke-width', '8');
      });
    });

    it('should use custom stroke width', () => {
      const { container } = render(<CircularProgress value={50} strokeWidth={12} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach(circle => {
        expect(circle).toHaveAttribute('stroke-width', '12');
      });
    });
  });

  describe('Colors', () => {
    it('should use primary color by default', () => {
      const { container } = render(<CircularProgress value={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.classList.contains('stroke-blue-600')).toBe(true);
    });

    it('should apply success color', () => {
      const { container } = render(<CircularProgress value={50} color="success" />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.classList.contains('stroke-green-500')).toBe(true);
    });

    it('should apply warning color', () => {
      const { container } = render(<CircularProgress value={50} color="warning" />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.classList.contains('stroke-yellow-500')).toBe(true);
    });

    it('should apply danger color', () => {
      const { container } = render(<CircularProgress value={50} color="danger" />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.classList.contains('stroke-red-600')).toBe(true);
    });
  });

  describe('SVG Properties', () => {
    it('should have background circle with gray color', () => {
      const { container } = render(<CircularProgress value={50} />);
      const bgCircle = container.querySelectorAll('circle')[0];
      expect(bgCircle.classList.contains('text-gray-200')).toBe(true);
    });

    it('should rotate SVG -90 degrees', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('transform')).toBe(true);
      expect(svg?.classList.contains('-rotate-90')).toBe(true);
    });

    it('should have transparent fill', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach(circle => {
        expect(circle).toHaveAttribute('fill', 'transparent');
      });
    });

    it('should have rounded line cap', () => {
      const { container } = render(<CircularProgress value={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke-linecap', 'round');
    });
  });

  describe('Label Display', () => {
    it('should center label', () => {
      const { container } = render(<CircularProgress value={75} />);
      const labelContainer = container.querySelector('.absolute.inset-0.flex.items-center.justify-center');
      expect(labelContainer).toBeInTheDocument();
    });

    it('should style label text', () => {
      const { container } = render(<CircularProgress value={50} />);
      const label = screen.getByText('50%');
      expect(label.className).toContain('text-xl');
      expect(label.className).toContain('font-bold');
      expect(label.className).toContain('text-gray-900');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<CircularProgress value={50} className="custom-circular" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-circular');
    });

    it('should have relative positioning for label overlay', () => {
      const { container } = render(<CircularProgress value={50} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('relative');
      expect(wrapper.className).toContain('inline-flex');
    });
  });

  describe('Transition', () => {
    it('should have smooth transition', () => {
      const { container } = render(<CircularProgress value={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.classList.contains('transition-all')).toBe(true);
      expect(progressCircle.classList.contains('duration-500')).toBe(true);
    });
  });
});
