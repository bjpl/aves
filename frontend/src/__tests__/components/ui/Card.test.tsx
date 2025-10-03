import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/ui/Card';

describe('Card Component', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply variant styles', () => {
      const { container, rerender } = render(<Card variant="default">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('shadow-sm');

      rerender(<Card variant="elevated">Content</Card>);
      expect(card.className).toContain('shadow-lg');

      rerender(<Card variant="outlined">Content</Card>);
      expect(card.className).toContain('border');

      rerender(<Card variant="interactive">Content</Card>);
      expect(card.className).toContain('cursor-pointer');
    });

    it('should apply padding styles', () => {
      const { container, rerender } = render(<Card padding="none">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('p-');

      rerender(<Card padding="sm">Content</Card>);
      expect(card.className).toContain('p-3');

      rerender(<Card padding="md">Content</Card>);
      expect(card.className).toContain('p-4');

      rerender(<Card padding="lg">Content</Card>);
      expect(card.className).toContain('p-6');
    });

    it('should apply hover styles when specified', () => {
      const { container } = render(<Card hover>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:scale-105');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('should render title and subtitle', () => {
      render(<CardHeader title="Card Title" subtitle="Card Subtitle" />);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
    });

    it('should render action element', () => {
      render(
        <CardHeader
          title="Title"
          action={<button>Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(
        <CardHeader>
          <div>Custom Content</div>
        </CardHeader>
      );
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<CardHeader className="custom-header" title="Title" />);
      expect(container.querySelector('.custom-header')).toBeInTheDocument();
    });
  });

  describe('CardBody', () => {
    it('should render children', () => {
      render(<CardBody>Body Content</CardBody>);
      expect(screen.getByText('Body Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<CardBody className="custom-body">Content</CardBody>);
      expect(container.querySelector('.custom-body')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render children', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('should apply alignment styles', () => {
      const { container, rerender } = render(<CardFooter align="left">Content</CardFooter>);
      let footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('justify-start');

      rerender(<CardFooter align="center">Content</CardFooter>);
      footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('justify-center');

      rerender(<CardFooter align="right">Content</CardFooter>);
      footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('justify-end');

      rerender(<CardFooter align="between">Content</CardFooter>);
      footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('justify-between');
    });
  });

  describe('Complete Card', () => {
    it('should render all sections together', () => {
      render(
        <Card>
          <CardHeader title="My Card" subtitle="Subtitle" />
          <CardBody>Body content here</CardBody>
          <CardFooter>
            <button>Cancel</button>
            <button>Save</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('My Card')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Body content here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });
});
