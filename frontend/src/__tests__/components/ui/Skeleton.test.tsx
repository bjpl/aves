import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonGrid } from '../../../components/ui/Skeleton';

describe('Skeleton Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Skeleton />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(<Skeleton />);
      const srText = screen.getByText('Loading...');
      expect(srText.className).toContain('sr-only');
    });

    it('should have base gray background', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('bg-gray-200');
    });
  });

  describe('Variants', () => {
    it('should apply text variant styles by default', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('rounded');
      expect(skeleton.className).toContain('h-4');
    });

    it('should apply circular variant styles', () => {
      render(<Skeleton variant="circular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('rounded-full');
    });

    it('should apply rectangular variant styles', () => {
      render(<Skeleton variant="rectangular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).not.toContain('rounded');
    });

    it('should apply rounded variant styles', () => {
      render(<Skeleton variant="rounded" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('rounded-lg');
    });
  });

  describe('Animations', () => {
    it('should use pulse animation by default', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('should use wave animation', () => {
      render(<Skeleton animation="wave" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('animate-shimmer');
      expect(skeleton.className).toContain('bg-gradient-to-r');
    });

    it('should have no animation when animation is none', () => {
      render(<Skeleton animation="none" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).not.toContain('animate-pulse');
      expect(skeleton.className).not.toContain('animate-shimmer');
    });
  });

  describe('Dimensions', () => {
    it('should use default width of 100% for text variant', () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(skeleton.style.width).toBe('100%');
    });

    it('should use default dimensions for circular variant', () => {
      const { container } = render(<Skeleton variant="circular" />);
      const skeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(skeleton.style.width).toBe('40px');
      expect(skeleton.style.height).toBe('40px');
    });

    it('should use custom width', () => {
      const { container } = render(<Skeleton width={200} />);
      const skeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
    });

    it('should use custom height', () => {
      const { container } = render(<Skeleton height={50} />);
      const skeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(skeleton.style.height).toBe('50px');
    });

    it('should accept string dimensions', () => {
      const { container } = render(<Skeleton width="50%" height="2rem" />);
      const skeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(skeleton.style.width).toBe('50%');
      expect(skeleton.style.height).toBe('2rem');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<Skeleton className="custom-skeleton" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton.className).toContain('custom-skeleton');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<Skeleton />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<Skeleton />);
      expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    });
  });
});

describe('SkeletonCard Component', () => {
  describe('Rendering', () => {
    it('should render card with image by default', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('[role="status"]');
      // Image + title + 3 lines
      expect(skeletons.length).toBe(5);
    });

    it('should render card without image', () => {
      const { container } = render(<SkeletonCard hasImage={false} />);
      const skeletons = container.querySelectorAll('[role="status"]');
      // Title + 3 lines
      expect(skeletons.length).toBe(4);
    });

    it('should render custom number of lines', () => {
      const { container } = render(<SkeletonCard lines={5} />);
      const textSkeletons = container.querySelectorAll('[role="status"]');
      // Image + title + 5 lines
      expect(textSkeletons.length).toBe(7);
    });
  });

  describe('Styling', () => {
    it('should have card styling', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('shadow-md');
      expect(card.className).toContain('p-4');
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonCard className="custom-card" />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-card');
    });
  });

  describe('Image Skeleton', () => {
    it('should render rectangular image skeleton', () => {
      const { container } = render(<SkeletonCard hasImage />);
      const imageSkeleton = container.querySelector('[role="status"]') as HTMLElement;
      expect(imageSkeleton.style.height).toBe('200px');
      expect(imageSkeleton.className).toContain('mb-4');
    });
  });

  describe('Title Skeleton', () => {
    it('should render title with 60% width', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('[role="status"]');
      const titleSkeleton = skeletons[1] as HTMLElement; // After image
      expect(titleSkeleton.style.width).toBe('60%');
    });
  });
});

describe('SkeletonList Component', () => {
  describe('Rendering', () => {
    it('should render 5 items by default', () => {
      const { container } = render(<SkeletonList />);
      const items = container.querySelectorAll('.flex.items-center.gap-4');
      expect(items.length).toBe(5);
    });

    it('should render custom number of items', () => {
      const { container } = render(<SkeletonList items={3} />);
      const items = container.querySelectorAll('.flex.items-center.gap-4');
      expect(items.length).toBe(3);
    });

    it('should render items with avatars by default', () => {
      const { container } = render(<SkeletonList />);
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBe(5);
    });

    it('should render items without avatars', () => {
      const { container } = render(<SkeletonList hasAvatar={false} />);
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBe(0);
    });
  });

  describe('Item Structure', () => {
    it('should render avatar with correct size', () => {
      const { container } = render(<SkeletonList items={1} />);
      const avatar = container.querySelector('.rounded-full') as HTMLElement;
      expect(avatar.style.width).toBe('48px');
      expect(avatar.style.height).toBe('48px');
    });

    it('should render two text lines per item', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.querySelector('.flex.items-center.gap-4');
      const textLines = item?.querySelectorAll('.flex-1 [role="status"]');
      expect(textLines?.length).toBe(2);
    });

    it('should have different widths for text lines', () => {
      const { container } = render(<SkeletonList items={1} />);
      const textLines = container.querySelectorAll('.flex-1 [role="status"]');
      const firstLine = textLines[0] as HTMLElement;
      const secondLine = textLines[1] as HTMLElement;
      expect(firstLine.style.width).toBe('70%');
      expect(secondLine.style.width).toBe('50%');
    });
  });

  describe('Styling', () => {
    it('should have proper spacing between items', () => {
      const { container } = render(<SkeletonList />);
      const items = container.querySelectorAll('.mb-4');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonList className="custom-list" />);
      expect(container.firstChild).toHaveClass('custom-list');
    });
  });
});

describe('SkeletonGrid Component', () => {
  describe('Rendering', () => {
    it('should render 6 items by default', () => {
      const { container } = render(<SkeletonGrid />);
      const cards = container.querySelectorAll('.bg-white.rounded-lg');
      expect(cards.length).toBe(6);
    });

    it('should render custom number of items', () => {
      const { container } = render(<SkeletonGrid items={4} />);
      const cards = container.querySelectorAll('.bg-white.rounded-lg');
      expect(cards.length).toBe(4);
    });

    it('should render items with images by default', () => {
      render(<SkeletonGrid items={2} />);
      const skeletons = screen.getAllByRole('status');
      // Each card: image + title + 2 lines = 4 skeletons per card
      expect(skeletons.length).toBe(8);
    });

    it('should render items without images', () => {
      render(<SkeletonGrid items={2} hasImage={false} />);
      const skeletons = screen.getAllByRole('status');
      // Each card: title + 2 lines = 3 skeletons per card
      expect(skeletons.length).toBe(6);
    });
  });

  describe('Grid Layout', () => {
    it('should use 3 columns by default', () => {
      const { container } = render(<SkeletonGrid />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    });

    it('should use custom number of columns', () => {
      const { container } = render(<SkeletonGrid columns={4} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    });

    it('should have gap between items', () => {
      const { container } = render(<SkeletonGrid />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('gap-4');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonGrid className="custom-grid" />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('custom-grid');
    });
  });

  describe('Card Integration', () => {
    it('should render SkeletonCard components', () => {
      const { container } = render(<SkeletonGrid items={1} />);
      const card = container.querySelector('.bg-white.rounded-lg.shadow-md.p-4');
      expect(card).toBeInTheDocument();
    });

    it('should pass hasImage prop to cards', () => {
      const { container } = render(<SkeletonGrid items={1} hasImage={false} />);
      const skeletons = container.querySelectorAll('[role="status"]');
      // Should have title + 2 lines (no image) = 3 skeletons
      expect(skeletons.length).toBe(3);
    });
  });
});
