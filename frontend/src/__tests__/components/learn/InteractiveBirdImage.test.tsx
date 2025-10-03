import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { InteractiveBirdImage } from '../../../components/learn/InteractiveBirdImage';

describe('InteractiveBirdImage', () => {
  const mockOnAnnotationHover = vi.fn();
  const mockOnAnnotationClick = vi.fn();

  const sampleAnnotations = [
    {
      id: 'ann-1',
      term: 'Pico',
      english: 'Beak',
      pronunciation: 'PEE-koh',
      x: 50,
      y: 30,
      description: 'The hard part of a bird's mouth',
    },
    {
      id: 'ann-2',
      term: 'Ala',
      english: 'Wing',
      pronunciation: 'AH-lah',
      x: 70,
      y: 50,
      description: 'Used for flying',
    },
    {
      id: 'ann-3',
      term: 'Cola',
      english: 'Tail',
      pronunciation: 'KOH-lah',
      x: 90,
      y: 70,
      description: 'Tail feathers',
    },
  ];

  const defaultProps = {
    imageUrl: 'https://example.com/bird.jpg',
    altText: 'Bird anatomy',
    annotations: sampleAnnotations,
    discoveredTerms: new Set<string>(),
    hoveredAnnotation: null,
    onAnnotationHover: mockOnAnnotationHover,
    onAnnotationClick: mockOnAnnotationClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Rendering', () => {
    it('should render without crashing', () => {
      render(<InteractiveBirdImage {...defaultProps} />);
      expect(screen.getByAltText('Bird anatomy')).toBeInTheDocument();
    });

    it('should display the bird image', () => {
      render(<InteractiveBirdImage {...defaultProps} />);
      const image = screen.getByAltText('Bird anatomy');
      expect(image).toHaveAttribute('src', 'https://example.com/bird.jpg');
    });

    it('should apply rounded corners to image', () => {
      render(<InteractiveBirdImage {...defaultProps} />);
      const image = screen.getByAltText('Bird anatomy');
      expect(image).toHaveClass('rounded-lg');
    });

    it('should make image full width', () => {
      render(<InteractiveBirdImage {...defaultProps} />);
      const image = screen.getByAltText('Bird anatomy');
      expect(image).toHaveClass('w-full');
    });
  });

  describe('Annotation Hotspots', () => {
    it('should render all annotation hotspots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const hotspots = container.querySelectorAll('.cursor-pointer');
      expect(hotspots.length).toBe(3);
    });

    it('should position hotspots correctly', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const hotspots = container.querySelectorAll('.cursor-pointer');

      // Check first hotspot position
      const firstHotspot = hotspots[0] as HTMLElement;
      expect(firstHotspot.style.left).toBe('50%');
      expect(firstHotspot.style.top).toBe('30%');
    });

    it('should center hotspots with transform', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const hotspots = container.querySelectorAll('.cursor-pointer');

      hotspots.forEach(hotspot => {
        expect(hotspot).toHaveClass('-translate-x-1/2', '-translate-y-1/2');
      });
    });
  });

  describe('Hotspot Interaction', () => {
    it('should call onAnnotationHover on mouse enter', async () => {
      const user = userEvent.setup();
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      const hotspots = container.querySelectorAll('.cursor-pointer');
      await user.hover(hotspots[0]);

      expect(mockOnAnnotationHover).toHaveBeenCalledWith('ann-1');
    });

    it('should call onAnnotationHover with null on mouse leave', async () => {
      const user = userEvent.setup();
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      const hotspots = container.querySelectorAll('.cursor-pointer');
      await user.hover(hotspots[0]);
      await user.unhover(hotspots[0]);

      expect(mockOnAnnotationHover).toHaveBeenCalledWith(null);
    });

    it('should call onAnnotationClick on click', async () => {
      const user = userEvent.setup();
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      const hotspots = container.querySelectorAll('.cursor-pointer');
      await user.click(hotspots[0]);

      expect(mockOnAnnotationClick).toHaveBeenCalledWith(sampleAnnotations[0]);
    });

    it('should handle rapid hover events', async () => {
      const user = userEvent.setup();
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      const hotspots = container.querySelectorAll('.cursor-pointer');
      await user.hover(hotspots[0]);
      await user.hover(hotspots[1]);
      await user.hover(hotspots[2]);

      expect(mockOnAnnotationHover).toHaveBeenCalledTimes(3);
    });
  });

  describe('Discovered Terms Styling', () => {
    it('should show undiscovered terms with blue color', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const blueDots = container.querySelectorAll('.bg-blue-500');
      expect(blueDots.length).toBe(3);
    });

    it('should show discovered terms with green color', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      const greenDots = container.querySelectorAll('.bg-green-500');
      expect(greenDots.length).toBe(1);
    });

    it('should animate undiscovered terms', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const pulsing = container.querySelectorAll('.animate-pulse');
      expect(pulsing.length).toBe(3);
    });

    it('should not animate discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2', 'ann-3']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      const pulsing = container.querySelectorAll('.animate-pulse');
      expect(pulsing.length).toBe(0);
    });

    it('should show checkmark on discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      const checkmarks = container.querySelectorAll('svg');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should handle partial discovery', () => {
      const propsWithPartialDiscovery = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithPartialDiscovery} />);

      const greenDots = container.querySelectorAll('.bg-green-500');
      const blueDots = container.querySelectorAll('.bg-blue-500');

      expect(greenDots.length).toBe(2);
      expect(blueDots.length).toBe(1);
    });
  });

  describe('Hover Tooltip', () => {
    it('should show tooltip when hovering annotation', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      render(<InteractiveBirdImage {...propsWithHover} />);

      expect(screen.getByText('Pico')).toBeInTheDocument();
      expect(screen.getByText('Beak')).toBeInTheDocument();
    });

    it('should not show tooltip when not hovering', () => {
      render(<InteractiveBirdImage {...defaultProps} />);

      expect(screen.queryByText('Pico')).not.toBeInTheDocument();
    });

    it('should show correct term in tooltip', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-2',
      };
      render(<InteractiveBirdImage {...propsWithHover} />);

      expect(screen.getByText('Ala')).toBeInTheDocument();
      expect(screen.getByText('Wing')).toBeInTheDocument();
    });

    it('should display both Spanish term and English translation', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-3',
      };
      render(<InteractiveBirdImage {...propsWithHover} />);

      expect(screen.getByText('Cola')).toBeInTheDocument();
      expect(screen.getByText('Tail')).toBeInTheDocument();
    });

    it('should style tooltip with dark background', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const tooltip = container.querySelector('.bg-gray-900');
      expect(tooltip).toBeInTheDocument();
    });

    it('should show tooltip above hotspot', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const tooltip = container.querySelector('.bottom-10');
      expect(tooltip).toBeInTheDocument();
    });

    it('should center tooltip horizontally', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const tooltip = container.querySelector('.left-1\\/2');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Hotspot Dot Styling', () => {
    it('should create circular dots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should apply consistent size to dots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const dots = container.querySelectorAll('.w-8.h-8');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should apply opacity to dots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const opaqueDots = container.querySelectorAll('.opacity-75');
      expect(opaqueDots.length).toBeGreaterThan(0);
    });

    it('should apply border to dots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const borderedDots = container.querySelectorAll('.border-3');
      expect(borderedDots.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations array', () => {
      const emptyProps = {
        ...defaultProps,
        annotations: [],
      };
      render(<InteractiveBirdImage {...emptyProps} />);

      expect(screen.getByAltText('Bird anatomy')).toBeInTheDocument();
    });

    it('should handle single annotation', () => {
      const singleAnnotationProps = {
        ...defaultProps,
        annotations: [sampleAnnotations[0]],
      };
      const { container } = render(<InteractiveBirdImage {...singleAnnotationProps} />);

      const hotspots = container.querySelectorAll('.cursor-pointer');
      expect(hotspots.length).toBe(1);
    });

    it('should handle annotations at edge positions', () => {
      const edgeAnnotations = [
        { ...sampleAnnotations[0], x: 0, y: 0 },
        { ...sampleAnnotations[1], x: 100, y: 100 },
      ];
      const edgeProps = {
        ...defaultProps,
        annotations: edgeAnnotations,
      };

      const { container } = render(<InteractiveBirdImage {...edgeProps} />);
      const hotspots = container.querySelectorAll('.cursor-pointer');

      expect((hotspots[0] as HTMLElement).style.left).toBe('0%');
      expect((hotspots[0] as HTMLElement).style.top).toBe('0%');
      expect((hotspots[1] as HTMLElement).style.left).toBe('100%');
      expect((hotspots[1] as HTMLElement).style.top).toBe('100%');
    });

    it('should handle all terms discovered', () => {
      const allDiscoveredProps = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2', 'ann-3']),
      };
      const { container } = render(<InteractiveBirdImage {...allDiscoveredProps} />);

      const greenDots = container.querySelectorAll('.bg-green-500');
      expect(greenDots.length).toBe(3);

      const blueDots = container.querySelectorAll('.bg-blue-500');
      expect(blueDots.length).toBe(0);
    });

    it('should handle annotations with special characters', () => {
      const specialAnnotations = [
        {
          id: 'ann-special',
          term: 'Plumón',
          english: 'Down feather',
          pronunciation: 'ploo-MOHN',
          x: 50,
          y: 50,
          description: 'Soft feathers',
        },
      ];

      const specialProps = {
        ...defaultProps,
        annotations: specialAnnotations,
        hoveredAnnotation: 'ann-special',
      };

      render(<InteractiveBirdImage {...specialProps} />);
      expect(screen.getByText('Plumón')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive alt text for image', () => {
      render(<InteractiveBirdImage {...defaultProps} />);
      expect(screen.getByAltText('Bird anatomy')).toBeInTheDocument();
    });

    it('should use clickable elements for hotspots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const clickableElements = container.querySelectorAll('.cursor-pointer');
      expect(clickableElements.length).toBeGreaterThan(0);
    });

    it('should provide visual feedback on hover', async () => {
      const user = userEvent.setup();
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      const hotspot = container.querySelector('.cursor-pointer') as HTMLElement;
      await user.hover(hotspot);

      expect(mockOnAnnotationHover).toHaveBeenCalled();
    });

    it('should have sufficient color contrast for discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      // Green dots should be visible
      const greenDots = container.querySelectorAll('.bg-green-500');
      expect(greenDots.length).toBe(1);
    });
  });

  describe('Tooltip Arrow', () => {
    it('should include tooltip arrow pointer', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const arrow = container.querySelector('.border-t-gray-900');
      expect(arrow).toBeInTheDocument();
    });

    it('should position arrow below tooltip', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const arrowContainer = container.querySelector('.translate-y-full');
      expect(arrowContainer).toBeInTheDocument();
    });
  });

  describe('Layout and Positioning', () => {
    it('should use relative positioning for container', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const relativeContainer = container.querySelector('.relative');
      expect(relativeContainer).toBeInTheDocument();
    });

    it('should use absolute positioning for hotspots', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);
      const absoluteElements = container.querySelectorAll('.absolute');
      expect(absoluteElements.length).toBeGreaterThan(0);
    });

    it('should apply z-index to tooltip', () => {
      const propsWithHover = {
        ...defaultProps,
        hoveredAnnotation: 'ann-1',
      };
      const { container } = render(<InteractiveBirdImage {...propsWithHover} />);

      const tooltip = container.querySelector('.z-10');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Checkmark SVG', () => {
    it('should render checkmark for discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      const svgCheckmarks = container.querySelectorAll('svg.text-white');
      expect(svgCheckmarks.length).toBeGreaterThan(0);
    });

    it('should position checkmark absolutely', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = render(<InteractiveBirdImage {...propsWithDiscovered} />);

      const absoluteSVG = container.querySelector('svg.absolute');
      expect(absoluteSVG).toBeInTheDocument();
    });

    it('should not render checkmark for undiscovered terms', () => {
      const { container } = render(<InteractiveBirdImage {...defaultProps} />);

      // Count SVGs - should only be from undiscovered state (if any)
      const allSVGs = container.querySelectorAll('svg');
      const checkmarkSVGs = container.querySelectorAll('svg.text-white');

      // Checkmarks should not exist for undiscovered terms
      expect(checkmarkSVGs.length).toBe(0);
    });
  });
});
